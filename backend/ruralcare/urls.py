from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse

def api_health(request):
    return JsonResponse({
        "status": "healthy",
        "system": "RuralCare AI Backend",
        "version": "1.0.0",
        "database": "MySQL (ruralcare_ai)"
    })

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/health/', api_health, name='api-health'),
    path('api/auth/', include('accounts.urls')),
    path('api/accounts/', include('accounts.urls')),
    path('api/admin/', include('accounts.urls')),
    path('api/hospitals/', include('hospitals.urls')),
    path('api/hospital/', include('hospitals.urls')),
    path('api/hospital/', include('ambulance.urls')),
    path('api/ambulance/', include('ambulance.urls')),
    path('api/driver/', include('ambulance.urls')),
    path('api/emergency/', include('emergency.urls')),
    path('api/patients/', include('patients.urls')),
    path('api/triage/', include('triage.urls')),
    path('api/ml/', include('ml_models.urls')),
    path('api/sync/', include('synchronization.urls')),
    path('api/notifications/', include('notifications.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
