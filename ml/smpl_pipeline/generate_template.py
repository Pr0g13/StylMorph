import numpy as np

def create_cylinder(radius_top, radius_bottom, height, segments=8, rows=4):
    verts = []
    for r in range(rows + 1):
        y = (r / rows) * height
        radius = radius_bottom + (radius_top - radius_bottom) * (r / rows)
        for s in range(segments):
            angle = 2 * np.pi * s / segments
            x = radius * np.cos(angle)
            z = radius * np.sin(angle)
            verts.append([x, y, z])
    
    faces = []
    for r in range(rows):
        for s in range(segments):
            v1 = r * segments + s
            v2 = r * segments + (s + 1) % segments
            v3 = (r + 1) * segments + (s + 1) % segments
            v4 = (r + 1) * segments + s
            faces.append([v1, v2, v3])
            faces.append([v1, v3, v4])
    return np.array(verts), np.array(faces)

def create_sphere(radius, segments=8, rings=8):
    verts = []
    # North pole
    verts.append([0, radius, 0])
    for r in range(1, rings):
        phi = np.pi * r / rings
        y = radius * np.cos(phi)
        r_slice = radius * np.sin(phi)
        for s in range(segments):
            theta = 2 * np.pi * s / segments
            x = r_slice * np.cos(theta)
            z = r_slice * np.sin(theta)
            verts.append([x, y, z])
    # South pole
    verts.append([0, -radius, 0])
    
    faces = []
    # Top cap
    for s in range(segments):
        faces.append([0, (s + 1) % segments + 1, s + 1])
    
    # Body
    for r in range(rings - 2):
        for s in range(segments):
            v1 = r * segments + s + 1
            v2 = r * segments + (s + 1) % segments + 1
            v3 = (r + 1) * segments + (s + 1) % segments + 1
            v4 = (r + 1) * segments + s + 1
            faces.append([v1, v2, v3])
            faces.append([v1, v3, v4])
            
    # Bottom cap
    last_v = len(verts) - 1
    offset = (rings - 2) * segments + 1
    for s in range(segments):
        faces.append([last_v, offset + s, offset + (s + 1) % segments])
        
    return np.array(verts), np.array(faces)

def shift_and_combine(mesh_list):
    all_verts = []
    all_faces = []
    v_offset = 0
    for verts, faces in mesh_list:
        all_verts.append(verts)
        all_faces.append(faces + v_offset)
        v_offset += len(verts)
    return np.concatenate(all_verts), np.concatenate(all_faces)

def generate_human():
    meshes = []
    
    # Torso (Hips to Shoulders)
    # Hip: 0 to 0.4 height, Chest: 0.4 to 0.8
    torso_v, torso_f = create_cylinder(0.2, 0.18, 0.6, segments=12, rows=6)
    torso_v += [0, 0.8, 0] # Position
    meshes.append((torso_v, torso_f))
    
    # Head
    head_v, head_f = create_sphere(0.1, segments=12, rings=10)
    head_v += [0, 1.5, 0]
    meshes.append((head_v, head_f))
    
    # Neck
    neck_v, neck_f = create_cylinder(0.05, 0.05, 0.1, segments=8, rows=2)
    neck_v += [0, 1.4, 0]
    meshes.append((neck_v, neck_f))
    
    # Legs (Left/Right)
    for side in [-1, 1]:
        leg_v, leg_f = create_cylinder(0.08, 0.05, 0.8, segments=8, rows=4)
        leg_v += [side * 0.1, 0, 0]
        meshes.append((leg_v, leg_f))
        
    # Arms (Left/Right) - T-Pose
    for side in [-1, 1]:
        arm_v, arm_f = create_cylinder(0.05, 0.03, 0.6, segments=8, rows=4)
        # Rotate arm (Z-axis rotation for T-pose)
        if side == -1: # Left
            arm_v = np.dot(arm_v, [[0, -1, 0], [1, 0, 0], [0, 0, 1]])
            arm_v += [-0.2, 1.3, 0]
        else: # Right
            arm_v = np.dot(arm_v, [[0, 1, 0], [-1, 0, 0], [0, 0, 1]])
            arm_v += [0.2, 1.3, 0]
        meshes.append((arm_v, arm_f))
        
    v, f = shift_and_combine(meshes)
    
    # Save to OBJ
    with open("base_human.obj", "w") as out:
        out.write("# Base Human Template\n")
        for vert in v:
            out.write(f"v {vert[0]:.4f} {vert[1]:.4f} {vert[2]:.4f}\n")
        for face in f:
            out.write(f"f {face[0]+1} {face[1]+1} {face[2]+1}\n")

if __name__ == "__main__":
    generate_human()
    print("base_human.obj generated.")
