from rest_framework.routers import DefaultRouter
from .views import EmergencyReportViewSet

router = DefaultRouter()
router.register(r'reports', EmergencyReportViewSet, basename='emergency-report')

urlpatterns = router.urls
