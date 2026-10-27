import uuid
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models

class Migration(migrations.Migration):

    dependencies = [
        ('ambulance', '0001_initial'),
        ('emergency', '0003_emergencycase'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='AmbulanceAssignment',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('uuid', models.UUIDField(db_index=True, default=uuid.uuid4, editable=False, unique=True)),
                ('assigned_at', models.DateTimeField(auto_now_add=True)),
                ('status', models.CharField(choices=[('ASSIGNED', 'Dispatched / Assigned'), ('EN_ROUTE', 'En Route to Incident'), ('ON_SCENE', 'On Scene'), ('PATIENT_PICKED', 'Patient Picked Up'), ('COMPLETED', 'Mission Completed'), ('CANCELLED', 'Assignment Cancelled')], default='ASSIGNED', max_length=30)),
                ('notes', models.TextField(blank=True, default='')),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('ambulance', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='assignments', to='ambulance.ambulance')),
                ('assigned_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='created_dispatches', to=settings.AUTH_USER_MODEL)),
                ('driver_paramedic', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='driver_dispatches', to=settings.AUTH_USER_MODEL)),
                ('emergency_case', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='assignments', to='emergency.emergencycase')),
            ],
            options={
                'ordering': ['-assigned_at'],
            },
        ),
    ]
