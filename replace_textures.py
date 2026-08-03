import re

with open('projects/01_horror-game/godot/scenes/test_room.tscn', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace external textures with internal GradientTexture2D or PlaceholderTexture2D
content = re.sub(
    r'\[ext_resource type="Texture2D" path="res://assets/images/floor\.png" id="4_floor"\]',
    r'[sub_resource type="GradientTexture2D" id="4_floor"]\nwidth = 64\nheight = 64',
    content
)

content = re.sub(
    r'\[ext_resource type="Texture2D" path="res://assets/images/center_obj\.png" id="5_center_obj"\]',
    r'[sub_resource type="PlaceholderTexture2D" id="5_center_obj"]\nsize = Vector2(256, 256)',
    content
)

content = re.sub(
    r'\[ext_resource type="Texture2D" path="res://assets/images/desk_fps\.png" id="6_desk_fp"\]',
    r'[sub_resource type="PlaceholderTexture2D" id="6_desk_fp"]\nsize = Vector2(520, 200)',
    content
)

content = re.sub(
    r'\[ext_resource type="Texture2D" path="res://assets/images/light_mask\.png" id="8_light"\]',
    r'[sub_resource type="GradientTexture2D" id="8_light"]\nwidth = 256\nheight = 256\nfill = 1\nfill_from = Vector2(0.5, 0.5)\nfill_to = Vector2(1, 0.5)',
    content
)

# Update the sub_resource ids in the scene nodes
content = re.sub(r'texture = ExtResource\("4_floor"\)', r'texture = SubResource("4_floor")', content)
content = re.sub(r'texture = ExtResource\("5_center_obj"\)', r'texture = SubResource("5_center_obj")', content)
content = re.sub(r'texture = ExtResource\("6_desk_fp"\)', r'texture = SubResource("6_desk_fp")', content)
content = re.sub(r'texture = ExtResource\("8_light"\)', r'texture = SubResource("8_light")', content)

with open('projects/01_horror-game/godot/scenes/test_room.tscn', 'w', encoding='utf-8') as f:
    f.write(content)

print("Scene updated to use internal textures.")
