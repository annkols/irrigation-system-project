from django.contrib import admin
from .models import (
    Experiment,
    ExperimentalFactor,
    ExperimentCameraAssignment,
    FactorLevel,
    Keyword,
    Pot,
    PotHardwareAssignment,
    Treatment,
)

# Register your models here.
admin.site.register(Experiment)
admin.site.register(Keyword)
admin.site.register(ExperimentalFactor)
admin.site.register(FactorLevel)
admin.site.register(Treatment)
admin.site.register(Pot)
admin.site.register(PotHardwareAssignment)
admin.site.register(ExperimentCameraAssignment)
