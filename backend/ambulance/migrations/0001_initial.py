import uuid
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models

class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('hospitals', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Ambulance',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('uuid', models.UUIDField(db_index=True, default=uuid.uuid4, editable=False, unique=True)),
                ('vehicle_number', models.CharField(max_length=50, unique=True)),
                ('vehicle_type', models.CharField(default='Basic Life Support', max_length=50)),
                ('equipment_type', models.CharField(default='Standard Life Support Equipment', max_length=100)),
                ('status', models.CharField(choices=[('AVAILABLE', 'Available'), ('ASSIGNED', 'Assigned to Emergency Case'), ('ON_THE_WAY', 'En Route to Scene'), ('PATIENT_PICKED_UP', 'Patient Picked Up'), ('BUSY', 'Busy / Transporting'), ('MAINTENANCE', 'In Maintenance')], default='AVAILABLE', max_length=30)),
                ('latitude', models.FloatField(blank=True, null=True)),
                ('longitude', models.FloatField(blank=True, null=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('driver', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='assigned_vehicles', to=settings.AUTH_USER_MODEL)),
                ('hospital', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='ambulances', to='hospitals.hospital')),
            ],
        ),
    ]
