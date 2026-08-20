"""
Расчёт эвольвентной геометрии зубчатых профилей (наружное и внутреннее зацепление).

Используется приближённая, но геометрически корректная инженерная модель:
эвольвентный профиль зуба + стандартные коэффициенты высоты головки/ножки.

Дополнительно поддерживается скругление острых углов, образующихся на стыке
эвольвентного профиля с окружностью вершин (tip_fillet_radius) и с окружностью
впадин (root_fillet_radius) - см. tooth_polygon().
"""
import numpy as np


def inv(alpha: float) -> float:
    """Эвольвентная функция inv(alpha) = tan(alpha) - alpha (alpha в радианах)."""
    return np.tan(alpha) - alpha


def rotate(point, angle: float):
    x, y = point
    c, s = np.cos(angle), np.sin(angle)
    return x * c - y * s, x * s + y * c


def fillet_corner(p_before, p_corner, p_after, radius, num_points=6):
    """
    Скругляет острый угол в точке p_corner дугой заданного радиуса, касательной
    к отрезкам (p_before -> p_corner) и (p_corner -> p_after).

    Возвращает список точек дуги (от касания со стороны p_before до касания
    со стороны p_after), без исходной вершины угла.
    Если radius <= 0 (или угол вырожденный/прямая линия) - возвращает саму
    вершину без изменений.
    """
    if radius is None or radius <= 1e-9:
        return [tuple(p_corner)]

    p_before = np.array(p_before, dtype=float)
    p_corner = np.array(p_corner, dtype=float)
    p_after = np.array(p_after, dtype=float)

    v1 = p_before - p_corner
    v2 = p_after - p_corner
    len1 = np.linalg.norm(v1)
    len2 = np.linalg.norm(v2)
    if len1 < 1e-9 or len2 < 1e-9:
        return [tuple(p_corner)]

    u1 = v1 / len1
    u2 = v2 / len2
    dot = np.clip(np.dot(u1, u2), -1.0, 1.0)
    theta = np.arccos(dot)
    if theta < 1e-6 or theta > np.pi - 1e-6:
        # угол вырожден (почти прямая линия) - скругление не имеет смысла
        return [tuple(p_corner)]

    half = theta / 2.0
    tan_len = radius / np.tan(half)
    # ограничиваем длину касательной, чтобы дуга не "съедала" соседние участки профиля
    max_tan = min(len1, len2) * 0.95
    if tan_len > max_tan:
        tan_len = max_tan
    actual_radius = tan_len * np.tan(half)
    if actual_radius < 1e-9:
        return [tuple(p_corner)]

    t1 = p_corner + u1 * tan_len
    t2 = p_corner + u2 * tan_len

    bis = u1 + u2
    bis_norm = np.linalg.norm(bis)
    if bis_norm < 1e-9:
        return [tuple(p_corner)]
    bis_dir = bis / bis_norm
    dist_center = actual_radius / np.sin(half)
    center = p_corner + bis_dir * dist_center

    a1 = np.arctan2(t1[1] - center[1], t1[0] - center[0])
    a2 = np.arctan2(t2[1] - center[1], t2[0] - center[0])
    ac = np.arctan2(p_corner[1] - center[1], p_corner[0] - center[0])

    diff_ccw = (a2 - a1) % (2 * np.pi)
    diff_cw = (a1 - a2) % (2 * np.pi)
    mid_ccw = a1 + diff_ccw / 2
    mid_cw = a2 + diff_cw / 2

    def circ_dist(x, y):
        d = abs((x - y) % (2 * np.pi))
        return min(d, 2 * np.pi - d)

    n = max(2, num_points)
    # выбираем дугу (по часовой или против часовой), которая огибает угол
    # со стороны исходной вершины, а не "срезает" деталь с другой стороны
    if circ_dist(mid_ccw, ac) < circ_dist(mid_cw, ac):
        angles = np.linspace(a1, a1 + diff_ccw, n)
    else:
        angles = np.linspace(a2, a2 + diff_cw, n)[::-1]

    return [(center[0] + actual_radius * np.cos(a),
              center[1] + actual_radius * np.sin(a)) for a in angles]


def tooth_flank_theta(m, z, alpha_deg=20.0, ha_coef=1.0, hf_coef=1.25,
                       internal=False, num_points=15):
    """
    Строит правую половину профиля одного зуба в полярных координатах (r, theta),
    theta отсчитывается от оси симметрии зуба.

    Возвращает: rs, thetas, rb (осн. окр.), ra (окр. вершин), rf (окр. впадин), rp (делительная).
    """
    alpha0 = np.radians(alpha_deg)
    d = m * z
    rp = d / 2.0
    rb = rp * np.cos(alpha0)

    if not internal:
        ra = rp + ha_coef * m
        rf = rp - hf_coef * m
    else:
        ra = rp - ha_coef * m
        rf = rp + hf_coef * m

    half_angle_p = np.pi / (2 * z)
    inv_p = inv(alpha0)

    r_start = max(rb, min(rf, ra))
    r_end = max(rf, ra)
    if r_end < rb:
        r_end = rb
    if r_start < rb:
        r_start = rb

    rs = np.linspace(r_start, r_end, num_points)
    alphas = np.arccos(np.clip(rb / rs, -1, 1))
    thetas = half_angle_p + inv_p - inv(alphas)
    return rs, thetas, rb, ra, rf, rp


def tooth_polygon(m, z, alpha_deg=20.0, ha_coef=1.0, hf_coef=1.25, internal=False,
                   num_points=15, root_arc_points=6, tip_arc_points=6,
                   tip_fillet_radius=0.0, root_fillet_radius=0.0, fillet_points=6):
    """
    Строит полный контур одного зуба (левая эвольвента + дуга вершины + правая эвольвента)
    плюс точки дуги впадины до начала следующего зуба.

    tip_fillet_radius  - радиус скругления острого угла на стыке эвольвенты
                          с окружностью вершин зубьев (ra), мм.
    root_fillet_radius - радиус скругления острого угла на стыке эвольвенты
                          с окружностью впадин зубьев (rf), мм.
    fillet_points       - число точек на каждой дуге скругления.

    Оба радиуса задаются отдельно для гибкого и жёсткого колеса на уровне
    вызывающего кода (main.py), поэтому их можно менять независимо друг от друга.
    """
    rs, thetas, rb, ra, rf, rp = tooth_flank_theta(
        m, z, alpha_deg, ha_coef, hf_coef, internal, num_points)

    r_root = rs[0]
    r_tip = rs[-1]

    right = [(r * np.cos(-th), r * np.sin(-th)) for r, th in zip(rs, thetas)]
    left = [(r * np.cos(th), r * np.sin(th)) for r, th in zip(rs, thetas)][::-1]

    pitch_step = 2 * np.pi / z

    tip_theta_end = thetas[-1]
    tip_pts = []
    for a in np.linspace(-tip_theta_end, tip_theta_end, tip_arc_points)[1:-1]:
        tip_pts.append((r_tip * np.cos(a), r_tip * np.sin(a)))

    root_theta_end = thetas[0]
    root_pts_mid = []
    for a in np.linspace(root_theta_end, pitch_step - root_theta_end, root_arc_points)[1:-1]:
        root_pts_mid.append((r_root * np.cos(a), r_root * np.sin(a)))

    next_right0 = rotate(right[0], pitch_step)
    next_right1 = rotate(right[1], pitch_step) if len(right) > 1 else next_right0

    # r_root (конец профиля со стороны меньшего theta) физически соответствует
    # либо окружности вершин ra (внутреннее/кольцевое зацепление), либо окружности
    # впадин rf (внешнее зацепление) - определяем это по факту, а не по индексу,
    # чтобы радиусы скругления всегда попадали на нужную окружность.
    if abs(r_root - ra) <= abs(r_root - rf):
        fillet_at_root_end = tip_fillet_radius
        fillet_at_tip_end = root_fillet_radius
    else:
        fillet_at_root_end = root_fillet_radius
        fillet_at_tip_end = tip_fillet_radius

    # Угол A: конец правой эвольвенты -> дуга вершины (или сразу левая эвольвента)
    before_A = right[-2] if len(right) > 1 else right[-1]
    after_A = tip_pts[0] if tip_pts else left[0]
    fillet_A = fillet_corner(before_A, right[-1], after_A, fillet_at_tip_end, fillet_points)

    # Угол B: дуга вершины (или правая эвольвента) -> начало левой эвольвенты
    before_B = tip_pts[-1] if tip_pts else right[-1]
    after_B = left[1] if len(left) > 1 else left[0]
    fillet_B = fillet_corner(before_B, left[0], after_B, fillet_at_tip_end, fillet_points)

    # Угол C: конец левой эвольвенты -> дуга впадины (или сразу следующий зуб)
    before_C = left[-2] if len(left) > 1 else left[-1]
    after_C = root_pts_mid[0] if root_pts_mid else next_right0
    fillet_C = fillet_corner(before_C, left[-1], after_C, fillet_at_root_end, fillet_points)

    # Угол D: дуга впадины (или левая эвольвента) -> начало правой эвольвенты след. зуба
    before_D = root_pts_mid[-1] if root_pts_mid else left[-1]
    fillet_D = fillet_corner(before_D, next_right0, next_right1, fillet_at_root_end, fillet_points)

    right_out = (right[1:-1] if len(right) > 2 else []) + fillet_A
    left_out = fillet_B + (left[1:-1] if len(left) > 2 else []) + fillet_C

    poly = right_out + tip_pts + left_out
    root_pts_next = root_pts_mid + fillet_D
    return poly, root_pts_next, rb, ra, rf, rp, pitch_step


def full_gear_polygon(m, z, alpha_deg=20.0, ha_coef=1.0, hf_coef=1.25, internal=False,
                       num_points=15, root_arc_points=6, tip_arc_points=6,
                       tip_fillet_radius=0.0, root_fillet_radius=0.0, fillet_points=6):
    """Строит полный замкнутый контур зубчатого венца (все z зубьев)."""
    tooth_pts, root_next, rb, ra, rf, rp, pitch_step = tooth_polygon(
        m, z, alpha_deg, ha_coef, hf_coef, internal, num_points, root_arc_points, tip_arc_points,
        tip_fillet_radius, root_fillet_radius, fillet_points)

    all_pts = []
    for i in range(z):
        ang = i * pitch_step
        for p in tooth_pts:
            all_pts.append(rotate(p, ang))
        for p in root_next:
            all_pts.append(rotate(p, ang))
    return all_pts, rb, ra, rf, rp


def circle_points(radius: float, num_points: int = 200):
    """Точки окружности радиуса radius (для ободов, отверстий и т.п.)."""
    angs = np.linspace(0, 2 * np.pi, num_points, endpoint=False)
    return [(radius * np.cos(a), radius * np.sin(a)) for a in angs]
