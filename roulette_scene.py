import math
import random
from pathlib import Path

import bpy
from mathutils import Vector

random.seed(19)
ROOT = Path(__file__).resolve().parent
FPS, END = 24, 300
WX, WY, WZ = -2.65, 0.05, 1.13
ORDER = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26]
REDS = {1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36}


def mat(name, color, rough=0.4, metal=0.0, bump=0.0):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*color, 1)
    m.use_nodes = True
    shader = m.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = (*color, 1)
    shader.inputs["Roughness"].default_value = rough
    shader.inputs["Metallic"].default_value = metal
    if bump:
        noise = m.node_tree.nodes.new("ShaderNodeTexNoise")
        noise.inputs["Scale"].default_value = 8
        noise.inputs["Detail"].default_value = 3
        b = m.node_tree.nodes.new("ShaderNodeBump")
        b.inputs["Strength"].default_value = bump
        b.inputs["Distance"].default_value = 0.04
        m.node_tree.links.new(noise.outputs["Fac"], b.inputs["Height"])
        m.node_tree.links.new(b.outputs["Normal"], shader.inputs["Normal"])
    return m


WOOD = mat("Mahogany | hand-rubbed shellac", (0.16, 0.047, 0.022), .22, .1, .18)
WALNUT = mat("Carved walnut", (.11, .043, .022), .27, .05, .12)
EBONY = mat("Polished ebony", (.022, .019, .018), .2, .12)
BRASS = mat("Aged brass", (.57, .34, .105), .25, .78)
GOLD = mat("Gilt brass", (.78, .52, .18), .2, .82)
FELT = mat("Bottle-green wool felt", (.025, .13, .081), .84, 0, .18)
RED = mat("Rouge enamel", (.39, .025, .025), .27, .1)
BLACK = mat("Noir enamel", (.018, .021, .02), .24, .12)
GREEN = mat("Single-zero enamel", (.02, .2, .1), .25, .1)
IVORY = mat("Ivory | aged billiard resin", (.89, .82, .64), .15, .03)
LINEN = mat("Warm white linen", (.86, .81, .7), .62)
VELVET = mat("Oxblood velvet", (.16, .012, .027), .9, 0, .14)
SKIN = mat("Warm complexion", (.48, .28, .18), .58)
SILVER = mat("Silvered hair", (.29, .28, .25), .78)
CARPET = mat("Persian carpet", (.12, .025, .025), .92, 0, .2)
CHIPS = [mat("Chip | " + n, c, .32) for n, c in [
    ("carmine", (.55, .025, .035)), ("ivory", (.84, .78, .64)),
    ("forest", (.035, .26, .14)), ("navy", (.035, .105, .27)), ("ochre", (.68, .39, .07))]]


def assign(obj, material):
    obj.data.materials.append(material)
    return obj


def bevel(obj, width=.03):
    mod = obj.modifiers.new("Soft worn edges", "BEVEL")
    mod.width, mod.segments = width, 3
    obj.modifiers.new("Weighted corner normals", "WEIGHTED_NORMAL")
    return obj


def box(name, loc, size, material, edge=0, parent=None):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    o = bpy.context.object
    o.name, o.dimensions = name, size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    assign(o, material)
    if edge:
        bevel(o, edge)
    if parent:
        o.parent = parent
    return o


def cyl(name, loc, radius, depth, material, parent=None, vertices=48, edge=0):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=depth, location=loc)
    o = bpy.context.object
    o.name = name
    assign(o, material)
    if edge:
        bevel(o, edge)
    if parent:
        o.parent = parent
    return o


def ball(name, loc, radius, material, parent=None):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=20, radius=radius, location=loc)
    o = bpy.context.object
    o.name = name
    bpy.ops.object.shade_smooth()
    assign(o, material)
    if parent:
        o.parent = parent
    return o


def ring(name, loc, major, minor, material, parent=None):
    bpy.ops.mesh.primitive_torus_add(major_radius=major, minor_radius=minor, major_segments=96, minor_segments=12, location=loc)
    o = bpy.context.object
    o.name = name
    bpy.ops.object.shade_smooth()
    assign(o, material)
    if parent:
        o.parent = parent
    return o


def lettering(body, loc, size, material, rotation=(0, 0, 0), parent=None):
    data = bpy.data.curves.new("Engraved lettering", "FONT")
    data.body, data.size = body, size
    data.align_x = data.align_y = "CENTER"
    data.extrude = .0007
    o = bpy.data.objects.new(body, data)
    bpy.context.collection.objects.link(o)
    o.location, o.rotation_euler = loc, rotation
    assign(o, material)
    if parent:
        o.parent = parent
    return o


def rod(name, a, b, radius, material):
    a, b = Vector(a), Vector(b)
    delta = b - a
    bpy.ops.mesh.primitive_cylinder_add(vertices=20, radius=radius, depth=delta.length, location=(a + b) / 2)
    o = bpy.context.object
    o.name = name
    o.rotation_euler = delta.to_track_quat("Z", "Y").to_euler()
    assign(o, material)
    return o


def sector(name, inner, outer, a0, a1, z, depth, material, parent):
    angles = [a0 + (a1 - a0) * i / 3 for i in range(4)]
    outline = [(inner * math.cos(a), inner * math.sin(a)) for a in angles]
    outline += [(outer * math.cos(a), outer * math.sin(a)) for a in reversed(angles)]
    n = len(outline)
    verts = [(x, y, z - depth/2) for x, y in outline] + [(x, y, z + depth/2) for x, y in outline]
    faces = [tuple(range(n-1, -1, -1)), tuple(range(n, 2*n))]
    faces += [(i, (i+1) % n, (i+1) % n + n, i+n) for i in range(n)]
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    mesh.materials.append(material)
    o = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(o)
    o.parent = parent
    bevel(o, .006)
    return o


def create_wheel():
    wheel = bpy.data.objects.new("WHEEL | antique single-zero", None)
    bpy.context.collection.objects.link(wheel)
    wheel.location = (WX, WY, WZ)
    cyl("Turned mahogany bowl", (0, 0, .075), 1.52, .22, WOOD, wheel, edge=.045)
    ring("Outer brass piping", (0, 0, .19), 1.44, .025, BRASS, wheel)
    ring("Polished wooden lip", (0, 0, .27), 1.34, .09, WALNUT, wheel)
    ring("Outer ball-running rail", (0, 0, .405), 1.25, .024, GOLD, wheel)
    ring("Inner ball-running rail", (0, 0, .39), 1.105, .021, BRASS, wheel)
    cyl("Sloped wooden deflector apron", (0, 0, .245), 1.19, .065, EBONY, wheel, edge=.025)
    for i in range(8):
        a = 2 * math.pi * i / 8 + math.pi / 8
        x, y = 1.19 * math.cos(a), 1.19 * math.sin(a)
        d = box("Brass diamond deflector %02d" % (i+1), (x, y, .34), (.15, .105, .075), GOLD, .022, wheel)
        d.rotation_euler[2] = a + math.pi/4
        ball("Deflector pin", (x, y, .385), .034, BRASS, wheel)

    rotor = bpy.data.objects.new("ROTOR | slowing wheelhead", None)
    bpy.context.collection.objects.link(rotor)
    rotor.parent = wheel
    cyl("Ebony rotor foundation", (0, 0, .19), 1.12, .12, EBONY, rotor, edge=.025)
    ring("Rotor gold inlay", (0, 0, .265), 1.105, .018, GOLD, rotor)
    step = 2 * math.pi / 37
    for i, n in enumerate(ORDER):
        a = i * step
        pocket = GREEN if n == 0 else RED if n in REDS else BLACK
        sector("Pocket %02d" % n, .55, 1.075, a-step*.475, a+step*.475, .29, .105, pocket, rotor)
        r = .815
        lettering(str(n), (r*math.cos(a), r*math.sin(a), .348), .09, IVORY, (0, 0, a+math.pi/2), rotor)
        fret = box("Raised brass fret", (.813*math.cos(a-step/2), .813*math.sin(a-step/2), .36), (.012, .53, .04), BRASS, .004, rotor)
        fret.rotation_euler[2] = a-step/2+math.pi/2
    ring("Inner ring", (0, 0, .36), .553, .018, BRASS, rotor)
    cyl("Central polished hardwood cone base", (0, 0, .38), .57, .22, WOOD, rotor, edge=.02)
    bpy.ops.mesh.primitive_cone_add(vertices=96, radius1=.55, radius2=.13, depth=.36, location=(0, 0, .62))
    cone = bpy.context.object
    cone.name = "Rising mahogany cone"
    assign(cone, WALNUT)
    bevel(cone, .015)
    cone.parent = rotor
    ring("Turret brass collar", (0, 0, .81), .16, .022, GOLD, rotor)
    ball("Ornate gold turret", (0, 0, .86), .15, GOLD, rotor)
    cyl("Precision spindle", (0, 0, -.08), .085, .38, BRASS, wheel, edge=.015)
    for z in (-.16, -.04, .08):
        ring("Visible spindle bearing", (0, 0, z), .11, .018, GOLD, wheel)
    for frame, angle in ((1, 0), (90, 2.45), (180, 4.1), (240, 5.0), (END, 5.7)):
        rotor.rotation_euler[2] = angle
        rotor.keyframe_insert(data_path="rotation_euler", index=2, frame=frame)
    for fc in rotor.animation_data.action.fcurves:
        for p in fc.keyframe_points:
            p.interpolation = "BEZIER"
    return rotor


def make_table():
    box("Carved table pedestal", (0, 0, .49), (9.7, 4.75, .74), WOOD, .14)
    box("Heavy lower apron", (0, 0, .83), (10.05, 5.02, .24), WALNUT, .08)
    box("Aged-brass edge inlay", (0, 0, .99), (10.12, 5.08, .075), BRASS, .025)
    box("Continuous polished rail", (0, 0, 1.055), (10.05, 5.01, .12), WOOD, .04)
    box("Inset green playing cloth", (0, 0, 1.103), (9.56, 4.52, .055), FELT, .025)
    for x in (-4.55, 4.55):
        for y in (-1.94, 1.94):
            box("Inlaid brass rosette", (x, y, 1.125), (.11, .11, .018), GOLD, .03)
    x0, cw, ch, y0 = -.35, .292, .37, -.12
    box("Number board brass border", (x0+1.78, y0, 1.137), (3.56, 1.17, .012), BRASS)
    box("Number board ground", (x0+1.78, y0, 1.146), (3.535, 1.145, .01), EBONY)
    for col in range(12):
        for row in range(3):
            n = col*3 + 3-row
            x, y = x0+.15+col*cw, y0+(1-row)*ch
            box("Wager cell %02d" % n, (x, y, 1.157), (cw-.012, ch-.012, .008), RED if n in REDS else BLACK, .004)
            lettering(str(n), (x, y, 1.164), .115, IVORY)
    zx = x0-.16
    box("Single green zero field", (zx, y0, 1.155), (.25, 1.13, .012), GREEN, .006)
    lettering("0", (zx, y0, 1.165), .16, IVORY)
    for y in (y0+.37, y0, y0-.37):
        box("Column bet", (3.82, y, 1.15), (.38, .34, .01), WALNUT, .01)
        lettering("2 TO 1", (3.82, y, 1.16), .075, IVORY)
    outside = [("1ST 12", .3), ("2ND 12", 1.05), ("3RD 12", 1.8), ("1-18", 2.58), ("EVEN", 3.18), ("RED", 3.78), ("BLACK", 4.38), ("ODD", 4.98), ("19-36", 5.58)]
    for label, x in outside:
        box("Outside bet", (x, -1.12, 1.15), (.57, .28, .01), WALNUT, .01)
        lettering(label, (x, -1.12, 1.16), .078, IVORY)
    for x in (-4.1, -2.65, -1.2, .25, 1.7, 3.15):
        for y in (-1.82, 1.82):
            cyl("Turned table leg", (x, y, .34), .18, .76, WALNUT, edge=.03)


def make_chips():
    for x, y, count, color in [(-.35, 1.52, 8, 0), (.05, 1.52, 12, 2), (.45, 1.52, 6, 3), (3.3, .95, 10, 4), (2.92, .95, 5, 1)]:
        for i in range(count):
            z = 1.16 + i*.043
            cyl("Painted casino chip", (x, y, z), .1, .034, CHIPS[color], vertices=32, edge=.008)
            ring("Ivory chip edge stripe", (x, y, z), .078, .005, IVORY)
    for x, y, c in [(-.12, .92, 2), (.26, -.79, 0), (2.66, .28, 4), (1.28, .92, 3)]:
        o = cyl("Loose chip", (x, y, 1.18), .1, .035, CHIPS[c], vertices=32, edge=.008)
        o.rotation_euler[0] = math.radians(random.uniform(-4, 4))
    box("Carved wooden chip tray", (4.18, 1.25, 1.17), (.42, 1.05, .12), WALNUT, .035)
    for i in range(5):
        for j in range(5):
            cyl("Tray chip", (4.02+i*.08, 1.05+j*.105, 1.26), .035, .045, CHIPS[i], vertices=24, edge=.005)
    box("Small brass cashbox", (4.03, -.7, 1.26), (.52, .36, .3), BRASS, .03)
    cyl("Wooden dolly | winning marker", (WX+.81, WY-.36, 1.2), .115, .055, GOLD, edge=.015)


def rotor_angle(f):
    return 2.45*(f-1)/89 if f <= 90 else 2.45+(4.1-2.45)*(f-90)/90 if f <= 180 else 4.1+.9*(f-180)/60 if f <= 240 else 5+.7*(f-240)/60


def animate_ball():
    o = ball("IVORY BALL | 20 mm | animated", (WX, WY, WZ+.49), .105, IVORY)
    def key(f, theta, r, z, roll):
        o.location = (WX+r*math.cos(theta), WY+r*math.sin(theta), WZ+z)
        o.rotation_euler = (roll, roll*.7, theta*2.4)
        o.keyframe_insert(data_path="location", frame=f)
        o.keyframe_insert(data_path="rotation_euler", frame=f)
    start = 2.0
    for f in range(1, 109, 2):
        t = f-1
        key(f, start-(.37*t-.00128*t*t), 1.205+.04*math.sin(t*.07), .49-.00125*t+.018*math.sin(t*.23), t*.22)
    hit = start-(.37*107-.00128*107*107)
    for f in range(109, 169, 2):
        t = f-109
        key(f, hit-.11*t-.001*t*t+.045*math.sin(t*.72), 1.16-.0048*t+.09*abs(math.sin(t*.53)), .34+.14*abs(math.sin(t*.57)), t*.31)
    for f in range(169, 255, 2):
        t = f-169
        key(f, hit-9.4-.065*t+.1*math.sin(t*.46), .79+.105*abs(math.sin(t*.42)), .43+.095*abs(math.sin(t*.47)), t*.4)
    local = (ORDER.index(17)+.5)*2*math.pi/37
    for f, wobble, lift in ((256,.2,.11),(266,-.16,.08),(276,.095,.045),(286,-.045,.018),(294,.018,.006),(END,0,0)):
        key(f, rotor_angle(f)+local+wobble, .817, .445+lift, wobble*4)
    for fc in o.animation_data.action.fcurves:
        for p in fc.keyframe_points:
            p.interpolation = "BEZIER"
    return o


def make_dealer():
    x, y = 2.55, 2.55
    for xx in (x-.16, x+.16):
        cyl("Polished formal shoe", (xx, y-.07, .13), .12, .11, EBONY, vertices=32, edge=.02)
        box("Tailcoat trouser leg", (xx, y, .62), (.22, .27, .94), EBONY, .08)
    torso = ball("Black formal tailcoat", (x, y, 1.56), .62, EBONY)
    torso.scale = (.42, .27, .75)
    shirt = ball("Linen shirt front", (x, y-.22, 1.62), .39, LINEN)
    shirt.scale = (.17, .09, .52)
    box("Dark waistcoat", (x, y-.29, 1.43), (.3, .07, .48), WALNUT, .035)
    cyl("Distinguished neck", (x, y, 2.12), .13, .24, SKIN)
    ball("Croupier face", (x, y, 2.37), .29, SKIN)
    hair = ball("Silvered hair", (x, y+.015, 2.55), .26, SILVER)
    hair.scale = (1, .95, .47)
    for sign in (-1, 1):
        ball("Swept side hair", (x+sign*.23, y, 2.37), .105, SILVER)
        ball("Moustache", (x+sign*.07, y-.292, 2.29), .066, SILVER).scale = (.9, .35, .42)
        ball("Focused eye", (x+sign*.085, y-.268, 2.39), .022, EBONY)
    ball("Black bow tie", (x, y-.31, 2.05), .085, EBONY).scale = (1.5, .42, .48)
    ball("Nose", (x, y-.295, 2.34), .034, SKIN)
    hand = (x-.56, y-.32, 1.54)
    rod("Rake arm | black sleeve", (x-.18, y-.08, 1.86), hand, .09, EBONY)
    ball("Rake hand", hand, .085, SKIN)
    tip = (-.88, -.62, 1.34)
    rod("Long polished croupier rake", hand, tip, .026, WALNUT)
    for off in (-.16, -.08, 0, .08, .16):
        rod("Rake brass tine", (tip[0]+off, tip[1]-.06, tip[2]), (tip[0]+off, tip[1]+.12, tip[2]), .012, BRASS)
    payout = (x+.42, y-.15, 1.56)
    rod("Payout arm | black sleeve", (x+.19, y-.08, 1.82), payout, .085, EBONY)
    ball("Payout hand", payout, .075, SKIN)
    for i in range(4):
        cyl("Neat payout stack", (2.94+i*.12, 1.2, 1.26), .09, .19, CHIPS[(i+1)%5], vertices=32, edge=.008)
    for f, dz in ((1, 0), (120, -.04), (190, -.01), (240, -.06), (END, -.02)):
        hand_obj = bpy.data.objects.get("Rake hand")
        hand_obj.location.z = 1.54+dz
        hand_obj.keyframe_insert(data_path="location", frame=f)


def make_shop():
    x, y = 5.45, 2.0
    box("Ball salon | walnut cabinet", (x, y, 1.23), (2.05, .72, 2.3), WOOD, .06)
    box("Oxblood velvet backing", (x, y-.375, 1.38), (1.78, .035, 1.52), VELVET, .015)
    for xx in (x-.96, x-.49, x+.49, x+.96):
        box("Cabinet gilt stile", (xx, y-.42, 1.42), (.045, .05, 1.85), GOLD, .01)
    for z in (.48, 2.35):
        box("Cabinet gilt rail", (x, y-.42, z), (1.97, .05, .06), BRASS, .015)
    variants = [
        ("IVORY", IVORY), ("GOLD", GOLD), ("DIAMOND", mat("Cut crystal", (.61,.84,.9), .12,.24)),
        ("RUBY", mat("Ruby", (.55,.015,.035), .16,.22)), ("EMERALD", mat("Emerald", (.015,.34,.14), .16,.18)),
        ("SAPPHIRE", mat("Sapphire", (.025,.12,.48), .16,.18)), ("OBSIDIAN", EBONY)]
    places = [(x-.62,1.62),(x,1.62),(x+.62,1.62),(x-.62,.91),(x,.91),(x+.62,.91),(x,2.03)]
    for (label, material), (xx, z) in zip(variants, places):
        box("Velvet cushion", (xx,y-.49,z-.18), (.47,.16,.13), VELVET, .025)
        ball(label+" | display ball", (xx,y-.57,z), .13, material)
        lettering(label, (xx,y-.585,z-.17), .067, IVORY, (math.pi/2,0,0))
    lettering("BALL SALON", (x,y-.42,2.56), .16, GOLD, (math.pi/2,0,0))
    box("Engraved brass plaque", (x,y-.43,.22), (2.05,.09,.3), BRASS, .02)
    lettering("UPGRADE YOUR BALL - MASTER THE WHEEL", (x,y-.49,.22), .1, IVORY, (math.pi/2,0,0))
    for xx, label in ((x-.68,"£5"),(x,"£50"),(x+.68,"£250")):
        box("Oak price tag", (xx,y-.5,.63), (.43,.06,.19), WALNUT, .015)
        lettering(label, (xx,y-.535,.63), .09, GOLD, (math.pi/2,0,0))


def make_room():
    box("Thick Persian carpet", (0,.3,-.13), (18,15,.18), CARPET)
    box("Dark paneled casino wall", (0,6.2,3.6), (18,.32,7.4), EBONY, .05)
    for x in range(-8,9):
        box("Raised walnut wall stile", (x,5.98,3.6), (.075,.07,7), WALNUT, .02)
    for z in (.55,1.05,5.8,6.7):
        box("Carved wall moulding", (0,5.93,z), (17.8,.14,.09), WOOD, .02)
    for x in (-7.3,7.3):
        box("Heavy burgundy curtain", (x,5.77,3.55), (1.75,.32,6.2), VELVET, .03)
        for dx in (-.65,-.32,0,.32,.65):
            cyl("Curtain velvet pleat", (x+dx,5.55,3.55), .085, 6, VELVET, vertices=24)
    for x, title in ((-4.9,"THE STAG HUNT"),(.1,"THE FOX AND HOUNDS"),(4.9,"COUNTRY PURSUITS")):
        box("Gilt oil-painting frame", (x,5.72,4.48), (2.1,.19,1.63), GOLD, .04)
        box("Dark painted canvas", (x,5.59,4.48), (1.87,.04,1.4), WALNUT)
        hill = ball("Painted distant landscape", (x,5.55,4.33), .72, FELT); hill.scale=(1.13,.035,.34)
        moon = ball("Painted pale moon", (x+.52,5.52,4.86), .13, GOLD)
        hound = ball("Painted hound silhouette", (x-.2,5.51,4.28), .17, EBONY); hound.scale=(1.2,.38,.6)
        lettering(title, (x,5.51,3.72), .09, GOLD, (math.pi/2,0,0))
    box("Gilt antique mirror frame", (-2.45,5.76,3.25), (1.75,.17,1.55), BRASS, .12)
    box("Smoked silver mirror", (-2.45,5.65,3.25), (1.51,.025,1.3), mat("Smoked silver",(.17,.18,.16),.11,.62))
    box("Side table", (6.75,.3,1), (1.55,1.05,.16), WOOD, .06)
    for x in (6.2,7.3):
        for y in (-.05,.65):
            cyl("Side table leg", (x,y,.48), .07,.94,WALNUT,edge=.015)
    for x in (6.45,6.98):
        cyl("Crystal whiskey tumbler", (x,.28,1.21), .12,.31, mat("Whiskey glass",(.55,.48,.29),.12,.12),vertices=32)
        ring("Tumbler gilt rim", (x,.28,1.37), .11,.009,GOLD)
    for x in (-5.8,0,5.8):
        cyl("Oil-lamp weighted base", (x,4.8,3.8), .22,.1,BRASS,edge=.015)
        cyl("Oil-lamp column", (x,4.8,4.15), .045,.65,GOLD)
        glass = ball("Frosted oil-lamp chimney", (x,4.8,4.52), .12, IVORY); glass.scale=(.8,.8,1.5)
        light = bpy.data.lights.new("Warm oil-lamp light", "POINT")
        light.energy, light.color, light.shadow_soft_size = 85,(1,.58,.24),.7
        obj = bpy.data.objects.new("Warm oil-lamp light",light); bpy.context.collection.objects.link(obj); obj.location=(x,4.55,4.35)
    dust = mat("Warm suspended dust", (.62,.4,.16),.3)
    for _ in range(100):
        ball("Floating dust mote", (random.uniform(-7,7),random.uniform(-3,5),random.uniform(.3,5.5)), random.uniform(.008,.018), dust)


def light_camera(ball_obj):
    world = bpy.data.worlds.new("Old smoke and varnish") if not bpy.data.worlds else bpy.data.worlds[0]
    bpy.context.scene.world = world
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Color"].default_value = (.13,.085,.045,1)
    world.node_tree.nodes["Background"].inputs["Strength"].default_value = .28
    for name, loc, power, color, size in (("Chandelier glow",(-1.5,-1,8.2),1350,(1,.73,.43),8), ("Soft front fill",(2,-7,5.3),650,(.72,.8,1),6)):
        data = bpy.data.lights.new(name,"AREA"); data.energy=power; data.shape="DISK"; data.size=size; data.color=color
        o=bpy.data.objects.new(name,data); bpy.context.collection.objects.link(o); o.location=loc
    haze_mat = bpy.data.materials.new("Thin warm atmospheric haze")
    haze_mat.use_nodes = True
    haze_mat.node_tree.nodes.clear()
    output = haze_mat.node_tree.nodes.new("ShaderNodeOutputMaterial")
    volume = haze_mat.node_tree.nodes.new("ShaderNodeVolumePrincipled")
    volume.inputs["Density"].default_value = .006
    volume.inputs["Color"].default_value = (.48,.38,.26,1)
    haze_mat.node_tree.links.new(volume.outputs["Volume"], output.inputs["Volume"])
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0,1,3.1))
    haze = bpy.context.object
    haze.name = "Subtle volumetric casino haze"
    haze.dimensions = (17,12,6.5)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    assign(haze, haze_mat)
    haze.display_type = "WIRE"
    bpy.ops.object.camera_add(location=(9.6,-15.8,10.7))
    camera=bpy.context.object; camera.name="Elevated cinematic three-quarter view"
    camera.rotation_euler=(Vector((.2,.8,1.65))-camera.location).to_track_quat("-Z","Y").to_euler()
    camera.data.lens=48; camera.data.dof.use_dof=True; camera.data.dof.focus_object=ball_obj; camera.data.dof.aperture_fstop=8
    bpy.context.scene.camera=camera


def build():
    bpy.ops.object.select_all(action="SELECT"); bpy.ops.object.delete(use_global=False)
    for item in bpy.data.materials:
        bpy.data.materials.remove(item)
    make_room(); make_table(); rotor=create_wheel(); make_chips(); make_dealer(); make_shop()
    roulette_ball=animate_ball(); light_camera(roulette_ball)
    scene=bpy.context.scene
    scene.frame_start,scene.frame_end,scene.render.fps=1,END,FPS
    scene.render.resolution_x,scene.render.resolution_y,scene.render.resolution_percentage=2560,1600,100
    scene.render.image_settings.file_format="PNG"; scene.render.image_settings.color_mode="RGBA"
    scene.render.engine="CYCLES"; scene.cycles.samples=48; scene.cycles.use_denoising=True
    scene.render.use_motion_blur=True
    scene.view_settings.view_transform="AgX"
    scene.render.filepath=str(ROOT/"roulette_scene.png")
    scene.frame_set(210)
    bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/"roulette_scene.blend"))
    bpy.ops.render.render(write_still=True)
    print("Scene and preview written to",ROOT)


if __name__ == "__main__":
    build()