"""
Расчёт эвольвентной геометрии зубчатых профилей (наружное и внутреннее зацепление).

Используется приближённая, но геометрически корректная инженерная модель:
эвольвентный профиль зуба + стандартные коэффициенты высоты головки/ножки.
"""
import numpy as np


def inv(alpha: float) -> float:
    """Эвольвентная функция inv(alpha) = tan(alpha) - alpha (alpha в радианах)."""
    return np.tan(alpha) - alpha


def rotate(point, angle: float):
    x, y = point
    c, s = np.cos(angle), np.sin(angle)
    return x * c - y * s, x * s + y * c


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

    half_angle_p = np.pi / (2 * z) + inv(alpha0)
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
                   num_points=15, root_arc_points=6, tip_arc_points=6):
    """Строит полный контур одного зуба (левая эвольвента + дуга вершины + правая эвольвента)
    плюс точки дуги впадины до начала следующего зуба."""
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
    root_pts_next = []
    for a in np.linspace(root_theta_end, pitch_step - root_theta_end, root_arc_points)[1:-1]:
        root_pts_next.append((r_root * np.cos(a), r_root * np.sin(a)))

    poly = right + tip_pts + left
    return poly, root_pts_next, rb, ra, rf, rp, pitch_step


def full_gear_polygon(m, z, alpha_deg=20.0, ha_coef=1.0, hf_coef=1.25, internal=False,
                       num_points=15, root_arc_points=6, tip_arc_points=6):
    """Строит полный замкнутый контур зубчатого венца (все z зубьев)."""
    tooth_pts, root_next, rb, ra, rf, rp, pitch_step = tooth_polygon(
        m, z, alpha_deg, ha_coef, hf_coef, internal, num_points, root_arc_points, tip_arc_points)

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
