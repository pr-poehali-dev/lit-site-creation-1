"""
Экспорт контуров волновой зубчатой передачи в DXF (через ezdxf).
"""
import ezdxf


LAYER_COLORS = {
    "FLEXSPLINE_CYLINDRICAL": 5,   # синий
    "FLEXSPLINE_INNER_BORE": 5,
    "FLEXSPLINE_DEFORMED": 3,      # зелёный
    "CIRCULAR_SPLINE_TEETH": 1,    # красный
    "CIRCULAR_SPLINE_OUTER": 1,
    "WAVE_GENERATOR_CAM": 6,       # пурпурный
    "WAVE_GENERATOR_BORE": 6,
    "TEXT": 7,
}


def new_document():
    doc = ezdxf.new("R2010", setup=True)
    doc.units = ezdxf.units.MM
    for name, color in LAYER_COLORS.items():
        if name not in doc.layers:
            doc.layers.new(name=name, dxfattribs={"color": color})
    return doc


def add_polyline(msp, points, layer, closed=True):
    pts = [(float(x), float(y)) for x, y in points]
    msp.add_lwpolyline(pts, close=closed, dxfattribs={"layer": layer})


def add_circle(msp, radius, layer, center=(0.0, 0.0)):
    msp.add_circle(center=center, radius=float(radius), dxfattribs={"layer": layer})


def add_label(msp, text, position, layer="TEXT", height=5.0):
    msp.add_text(
        text, dxfattribs={"layer": layer, "height": height}
    ).set_placement(position, align=ezdxf.enums.TextEntityAlignment.LEFT)


def save(doc, filepath):
    doc.saveas(filepath)
