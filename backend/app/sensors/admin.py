from django.contrib import admin
from .models import Sensor, SensorDevice, SensorDeviceAssignment

# Register your models here.
admin.site.register(Sensor)
admin.site.register(SensorDevice)
admin.site.register(SensorDeviceAssignment)
