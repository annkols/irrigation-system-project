
PERMISSION_FIELDS = [
    "can_edit_experiment",
    "can_end_experiment",
    "can_add_notes",
    "can_edit_notes",
    "can_delete_notes",
    "can_manage_frames",
    "can_control_pump",
]

PERMISSION_PRESETS = {
    "viewer": [],
    "note_editor": [
        "can_add_notes",
        "can_edit_notes",
    ],
    "experiment_editor": [
        "can_edit_experiment",
        "can_add_notes",
        "can_edit_notes",
        "can_delete_notes",
    ],
    "experiment_coowner": [
        "can_manage_frames",
        "can_control_pump",
    ]
}
