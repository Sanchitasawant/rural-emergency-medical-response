import os
import sys
import django

sys.path.insert(0, r'c:\Users\sanchita\Desktop\rural-emergency-ai\backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'ruralcare.settings')
django.setup()

from django.db import connection

with connection.cursor() as cursor:
    cursor.execute("SET FOREIGN_KEY_CHECKS = 0;")
    cursor.execute("DROP TABLE IF EXISTS ambulance_ambulanceassignment;")
    cursor.execute("DROP TABLE IF EXISTS ambulance_ambulance;")
    cursor.execute("DROP TABLE IF EXISTS emergency_emergencycase;")
    cursor.execute("DROP TABLE IF EXISTS hospitals_hospital;")
    cursor.execute("DELETE FROM django_migrations WHERE app IN ('hospitals', 'ambulance');")
    cursor.execute("DELETE FROM django_migrations WHERE app='emergency' AND name='0003_emergencycase';")
    cursor.execute("SET FOREIGN_KEY_CHECKS = 1;")

print("Migration table state reset successfully.")
