"""
Генератор DXF-контуров волновой зубчатой передачи (Harmonic Drive).

ВАЖНО: используется приближённая, но геометрически корректная инженерная модель:
  - эвольвентный профиль зубьев (стандартный ГОСТ/ISO подход);
  - деформация гибкого колеса генератором волн по закону w(theta) = w0*cos(2*theta).

Реальные волновые передачи используют запатентованные сопряжённые профили
и требуют инженерной валидации (расчёт на прочность, ресурс, беззазорность).
Этот скрипт подходит для визуализации, обучения и прототипов
(3D-печать, лазерная резка), но не заменяет промышленный инжиниринг.

Как использовать:
  1. Отредактируйте параметры в блоке "ИСХОДНЫЕ ДАННЫЕ" ниже.
  2. Запустите файл (Run) в PyCharm.
  3. Результат появится в папке output/ рядом со скриптом:
       - flexspline_cylindrical.dxf   - гибкое колесо, цилиндрическое (для изготовления)
       - flexspline_deformed.dxf      - гибкое колесо, деформированное (рабочее, эллиптическое)
       - circular_spline.dxf          - жёсткое колесо (неподвижное, внутренние зубья)
       - wave_generator_cam.dxf       - кулачок генератора волн
       - assembly_preview.dxf         - все контуры вместе (для проверки зацепления)
       - preview.png                  - картинка для быстрого просмотра без CAD
"""
import os

from gear_geometry import full_gear_polygon, circle_points
from deformation import wave_amplitude_from_teeth, deform_polygon, wave_generator_cam_profile
from dxf_export import new_document, add_polyline, add_circle, add_label, save


# =====================================================================
# ИСХОДНЫЕ ДАННЫЕ - отредактируйте под свою передачу
# =====================================================================

MODULE = 0.5                    # модуль зацепления, мм
Z_FLEXSPLINE = 200               # число зубьев гибкого колеса (чётное)
NUM_WAVES = 2                     # число волн генератора (стандартно 2)
# число зубьев жёсткого колеса обычно на NUM_WAVES больше:
Z_CIRCULAR_SPLINE = Z_FLEXSPLINE + NUM_WAVES

PRESSURE_ANGLE_DEG = 20.0        # угол зацепления, градусы (стандарт 20)
ADDENDUM_COEF = 1.0              # коэффициент высоты головки зуба
DEDENDUM_COEF = 1.25             # коэффициент высоты ножки зуба

FLEXSPLINE_WALL_THICKNESS = 2.0  # толщина стенки гибкого колеса (кольца), мм
CIRCULAR_SPLINE_RIM_THICKNESS = 5.0   # толщина обода жёсткого колеса, мм

WAVE_GENERATOR_BORE_DIAMETER = 10.0   # диаметр центрального отверстия под вал, мм

NUM_POINTS_PER_FLANK = 15        # точек на эвольвентном профиле одного зуба (гладкость)
NUM_POINTS_TIP_ARC = 6           # точек на дуге вершины зуба
NUM_POINTS_ROOT_ARC = 6          # точек на дуге впадины между зубьями

# --- Радиусы скругления острых углов профиля, мм ---
# (стык эвольвенты с окружностью вершин / окружностью впадин зубьев).
# 0 - без скругления (острый угол, как раньше).
FLEXSPLINE_TIP_FILLET_RADIUS = 0.05    # гибкое колесо: угол у вершины зуба
FLEXSPLINE_ROOT_FILLET_RADIUS = 0.1    # гибкое колесо: угол у впадины зуба
CIRCULAR_SPLINE_TIP_FILLET_RADIUS = 0.05    # жёсткое колесо: угол у вершины зуба
CIRCULAR_SPLINE_ROOT_FILLET_RADIUS = 0.1    # жёсткое колесо: угол у впадины зуба
NUM_POINTS_FILLET = 6            # точек на каждой дуге скругления

OUTPUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "output")

# =====================================================================


def build_flexspline_cylindrical():
    """Гибкое колесо в свободном (недеформированном) цилиндрическом виде -
    контур для изготовления (например, лазерная резка развёртки/кольца)."""
    pts, rb, ra, rf, rp = full_gear_polygon(
        MODULE, Z_FLEXSPLINE,
        alpha_deg=PRESSURE_ANGLE_DEG, ha_coef=ADDENDUM_COEF, hf_coef=DEDENDUM_COEF,
        internal=False,
        num_points=NUM_POINTS_PER_FLANK,
        root_arc_points=NUM_POINTS_ROOT_ARC, tip_arc_points=NUM_POINTS_TIP_ARC,
        tip_fillet_radius=FLEXSPLINE_TIP_FILLET_RADIUS,
        root_fillet_radius=FLEXSPLINE_ROOT_FILLET_RADIUS,
        fillet_points=NUM_POINTS_FILLET,
    )
    inner_radius = rf - FLEXSPLINE_WALL_THICKNESS
    return {
        "teeth": pts,
        "inner_bore_radius": inner_radius,
        "rb": rb, "ra": ra, "rf": rf, "rp": rp,
    }


def build_flexspline_deformed(flexspline_data, phase=0.0):
    """Гибкое колесо в рабочем деформированном (эллиптическом) виде -
    после установки генератора волн внутрь."""
    w0 = wave_amplitude_from_teeth(MODULE, Z_FLEXSPLINE, Z_CIRCULAR_SPLINE)
    teeth_deformed = deform_polygon(flexspline_data["teeth"], w0, NUM_WAVES, phase)

    bore_circle = circle_points(flexspline_data["inner_bore_radius"], num_points=200)
    bore_deformed = deform_polygon(bore_circle, w0, NUM_WAVES, phase)

    return {
        "teeth": teeth_deformed,
        "bore": bore_deformed,
        "w0": w0,
    }


def build_circular_spline():
    """Жёсткое колесо - неподвижное, с внутренними зубьями."""
    pts, rb, ra, rf, rp = full_gear_polygon(
        MODULE, Z_CIRCULAR_SPLINE,
        alpha_deg=PRESSURE_ANGLE_DEG, ha_coef=ADDENDUM_COEF, hf_coef=DEDENDUM_COEF,
        internal=True,
        num_points=NUM_POINTS_PER_FLANK,
        root_arc_points=NUM_POINTS_ROOT_ARC, tip_arc_points=NUM_POINTS_TIP_ARC,
        tip_fillet_radius=CIRCULAR_SPLINE_TIP_FILLET_RADIUS,
        root_fillet_radius=CIRCULAR_SPLINE_ROOT_FILLET_RADIUS,
        fillet_points=NUM_POINTS_FILLET,
    )
    outer_radius = rf + CIRCULAR_SPLINE_RIM_THICKNESS
    return {
        "teeth": pts,
        "outer_radius": outer_radius,
        "rb": rb, "ra": ra, "rf": rf, "rp": rp,
    }


def build_wave_generator(flexspline_data, w0):
    """Кулачок генератора волн - эллипсовидная форма, деформирующая гибкое колесо
    изнутри. Средний радиус берётся равным внутреннему диаметру гибкого колеса
    (посадка с натягом через подшипник в реальной конструкции)."""
    r_mean = flexspline_data["inner_bore_radius"]
    cam = wave_generator_cam_profile(r_mean, w0, NUM_WAVES, num_points=360)
    return {
        "cam": cam,
        "bore_radius": WAVE_GENERATOR_BORE_DIAMETER / 2.0,
    }


def export_all():
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    fs = build_flexspline_cylindrical()
    fs_def = build_flexspline_deformed(fs)
    cs = build_circular_spline()
    wg = build_wave_generator(fs, fs_def["w0"])

    # --- 1. Гибкое колесо, цилиндрическое ---
    doc = new_document()
    msp = doc.modelspace()
    add_polyline(msp, fs["teeth"], "FLEXSPLINE_CYLINDRICAL")
    add_circle(msp, fs["inner_bore_radius"], "FLEXSPLINE_INNER_BORE")
    add_label(msp, f"Flexspline cylindrical  m={MODULE} z={Z_FLEXSPLINE}",
              (-fs["ra"], fs["ra"] + 5))
    save(doc, os.path.join(OUTPUT_DIR, "flexspline_cylindrical.dxf"))

    # --- 2. Гибкое колесо, деформированное ---
    doc = new_document()
    msp = doc.modelspace()
    add_polyline(msp, fs_def["teeth"], "FLEXSPLINE_DEFORMED")
    add_polyline(msp, fs_def["bore"], "FLEXSPLINE_DEFORMED")
    add_label(msp, f"Flexspline deformed (working)  w0={fs_def['w0']:.4f} mm",
              (-fs["ra"] - fs_def["w0"], fs["ra"] + fs_def["w0"] + 5))
    save(doc, os.path.join(OUTPUT_DIR, "flexspline_deformed.dxf"))

    # --- 3. Жёсткое колесо ---
    doc = new_document()
    msp = doc.modelspace()
    add_polyline(msp, cs["teeth"], "CIRCULAR_SPLINE_TEETH")
    add_circle(msp, cs["outer_radius"], "CIRCULAR_SPLINE_OUTER")
    add_label(msp, f"Circular spline (fixed)  m={MODULE} z={Z_CIRCULAR_SPLINE}",
              (-cs["outer_radius"], cs["outer_radius"] + 5))
    save(doc, os.path.join(OUTPUT_DIR, "circular_spline.dxf"))

    # --- 4. Генератор волн ---
    doc = new_document()
    msp = doc.modelspace()
    add_polyline(msp, wg["cam"], "WAVE_GENERATOR_CAM")
    add_circle(msp, wg["bore_radius"], "WAVE_GENERATOR_BORE")
    add_label(msp, "Wave generator cam", (-fs["ra"], fs["ra"] * 0.15 + 5))
    save(doc, os.path.join(OUTPUT_DIR, "wave_generator_cam.dxf"))

    # --- 5. Сборочный чертёж (все контуры вместе, для проверки зацепления) ---
    doc = new_document()
    msp = doc.modelspace()
    add_polyline(msp, cs["teeth"], "CIRCULAR_SPLINE_TEETH")
    add_circle(msp, cs["outer_radius"], "CIRCULAR_SPLINE_OUTER")
    add_polyline(msp, fs_def["teeth"], "FLEXSPLINE_DEFORMED")
    add_polyline(msp, fs_def["bore"], "FLEXSPLINE_DEFORMED")
    add_polyline(msp, wg["cam"], "WAVE_GENERATOR_CAM")
    add_circle(msp, wg["bore_radius"], "WAVE_GENERATOR_BORE")
    add_label(msp, "Assembly preview (deformed working state)",
              (-cs["outer_radius"], cs["outer_radius"] + 8))
    save(doc, os.path.join(OUTPUT_DIR, "assembly_preview.dxf"))

    print("Готово! DXF-файлы сохранены в папке:", OUTPUT_DIR)
    print(f"  Модуль: {MODULE} мм")
    print(f"  Гибкое колесо: z={Z_FLEXSPLINE}")
    print(f"  Жёсткое колесо: z={Z_CIRCULAR_SPLINE}")
    print(f"  Амплитуда деформации w0: {fs_def['w0']:.4f} мм")
    print(f"  Передаточное отношение (i = z_fs/(z_cs - z_fs)): "
          f"{Z_FLEXSPLINE / NUM_WAVES:.2f}")

    return fs, fs_def, cs, wg


def make_png_preview(flexspline_data, flexspline_deformed_data, circular_spline_data, wave_generator_data):
    """Дополнительно сохраняет preview.png для быстрого визуального контроля
    (matplotlib), без необходимости открывать DXF в CAD-программе."""
    try:
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
    except ImportError:
        print("matplotlib не установлен - PNG-превью пропущено (это не критично).")
        return

    fig, axes = plt.subplots(1, 2, figsize=(14, 7))

    ax = axes[0]
    x = [p[0] for p in flexspline_data["teeth"]] + [flexspline_data["teeth"][0][0]]
    y = [p[1] for p in flexspline_data["teeth"]] + [flexspline_data["teeth"][0][1]]
    ax.plot(x, y, "b-", lw=0.8, label="Flexspline (cylindrical)")
    bore = circle_points(flexspline_data["inner_bore_radius"])
    bx = [p[0] for p in bore] + [bore[0][0]]
    by = [p[1] for p in bore] + [bore[0][1]]
    ax.plot(bx, by, "b--", lw=0.8)
    ax.set_aspect("equal")
    ax.set_title("Flexspline - cylindrical (for manufacturing)")
    ax.legend()
    ax.grid(True)

    ax = axes[1]
    xc = [p[0] for p in circular_spline_data["teeth"]] + [circular_spline_data["teeth"][0][0]]
    yc = [p[1] for p in circular_spline_data["teeth"]] + [circular_spline_data["teeth"][0][1]]
    ax.plot(xc, yc, "r-", lw=0.8, label="Circular spline (fixed)")

    xf = [p[0] for p in flexspline_deformed_data["teeth"]] + [flexspline_deformed_data["teeth"][0][0]]
    yf = [p[1] for p in flexspline_deformed_data["teeth"]] + [flexspline_deformed_data["teeth"][0][1]]
    ax.plot(xf, yf, "g-", lw=0.8, label="Flexspline (deformed, meshing)")

    xb = [p[0] for p in flexspline_deformed_data["bore"]] + [flexspline_deformed_data["bore"][0][0]]
    yb = [p[1] for p in flexspline_deformed_data["bore"]] + [flexspline_deformed_data["bore"][0][1]]
    ax.plot(xb, yb, "g--", lw=0.8)

    xw = [p[0] for p in wave_generator_data["cam"]] + [wave_generator_data["cam"][0][0]]
    yw = [p[1] for p in wave_generator_data["cam"]] + [wave_generator_data["cam"][0][1]]
    ax.plot(xw, yw, "m-", lw=0.8, label="Wave generator cam")

    wbore = circle_points(wave_generator_data["bore_radius"])
    wbx = [p[0] for p in wbore] + [wbore[0][0]]
    wby = [p[1] for p in wbore] + [wbore[0][1]]
    ax.plot(wbx, wby, "m--", lw=0.8)

    ax.set_aspect("equal")
    ax.set_title("Assembly - deformed / meshing state")
    ax.legend(loc="upper right", fontsize=8)
    ax.grid(True)

    plt.tight_layout()
    out_path = os.path.join(OUTPUT_DIR, "preview.png")
    plt.savefig(out_path, dpi=150)
    print("Превью сохранено:", out_path)


if __name__ == "__main__":
    result_fs, result_fs_def, result_cs, result_wg = export_all()
    make_png_preview(result_fs, result_fs_def, result_cs, result_wg)