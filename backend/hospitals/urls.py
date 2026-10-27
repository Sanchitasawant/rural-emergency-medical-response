from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import HospitalViewSet, HospitalReportViewSet, EmergencyCaseViewSet

router = DefaultRouter()
router.register(r'hospitals', HospitalViewSet, basename='hospital')
router.register(r'reports', HospitalReportViewSet, basename='hospital-report')
router.register(r'cases', EmergencyCaseViewSet, basename='hospital-case')

urlpatterns = [
    path('', include(router.urls)),
]
