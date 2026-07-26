"""
Деформация гибкого колеса генератором волн (приближённая инженерная модель).

Используется классический закон волновой деформации:
    w(theta) = w0 * cos(2*theta)          - радиальное смещение
    u(theta) = -(w0/2) * sin(2*theta)     - тангенциальное (окружное) смещение

Это стандартное приближение, обеспечивающее (приблизительно) нерастяжимость
срединной линии гибкого колеса при овализации генератором волн с двумя "волнами"
(2 diametrically opposed lobes) - см. классическую теорию Мусера/волновых передач.
"""
import numpy as np


def wave_amplitude_from_teeth(m, z_flexspline, z_circular_spline):
    """
    Стандартное соотношение для волновой передачи:
    разница чисел зубьев обычно равна числу волн генератора (чаще 2).
    Максимальная радиальная деформация w0 приближённо равна:
        w0 = m * (z_circular_spline - z_flexspline) / 2
    что соответствует половине разницы делительных радиусов колёс.
    """
    return m * (z_circular_spline - z_flexspline) / 2.0


def deform_point(x, y, w0, num_waves=2, phase=0.0):
    """
    Применяет волновую деформацию к точке (x, y), заданной в полярных
    координатах недеформированного (цилиндрического) гибкого колеса.

    num_waves - число волн генератора (для классической волновой передачи = 2).
    phase - поворот генератора волн (рад), для анимации/произвольной ориентации.
    """
    r = np.hypot(x, y)
    theta = np.arctan2(y, x)

    n = num_waves
    ang = n * (theta - phase)

    w = w0 * np.cos(ang)
    u = -(w0 / n) * np.sin(ang)

    r_new = r + w
    theta_new = theta + (u / r if r > 1e-9 else 0.0)

    return r_new * np.cos(theta_new), r_new * np.sin(theta_new)


def deform_polygon(points, w0, num_waves=2, phase=0.0):
    """Применяет deform_point ко всему списку точек контура."""
    return [deform_point(x, y, w0, num_waves, phase) for (x, y) in points]


def wave_generator_cam_profile(r_mean, w0, num_waves=2, num_points=360):
    """
    Приближённый профиль кулачка генератора волн - средняя линия эквидистанты,
    по которой деформируется гибкое колесо (r_mean +/- w0 по закону cos(num_waves*theta)).

    r_mean - средний радиус кулачка (обычно = внутр. радиус гибкого колеса
             в свободном состоянии минус толщина стенки/подшипника, либо
             просто (ra_flexspline_internal) - подбирается пользователем).
    """
    thetas = np.linspace(0, 2 * np.pi, num_points, endpoint=False)
    pts = []
    for th in thetas:
        r = r_mean + w0 * np.cos(num_waves * th)
        pts.append((r * np.cos(th), r * np.sin(th)))
    return pts
