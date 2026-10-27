from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import CustomTokenObtainPairView, RegisterView, ProfileView, LogoutView, UserListView
from .views_admin import (
    admin_dashboard_metrics,
    admin_users_list_create,
    admin_user_toggle_status,
    admin_hospitals_list_create,
    admin_hospital_detail_update,
    admin_ambulances_list_create,
    admin_ambulance_detail_update,
    admin_cases_overview,
    admin_analytics_data,
    admin_activity_logs,
    admin_models_info,
    admin_settings_config
)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='auth-register'),
    path('login/', CustomTokenObtainPairView.as_view(), name='auth-login'),
    path('refresh/', TokenRefreshView.as_view(), name='auth-refresh'),
    path('logout/', LogoutView.as_view(), name='auth-logout'),
    path('me/', ProfileView.as_view(), name='auth-profile'),
    path('users/', UserListView.as_view(), name='admin-users-list'),

    # Step 8 Admin API Routes
    path('admin/dashboard/', admin_dashboard_metrics, name='admin-dashboard'),
    path('admin/users/', admin_users_list_create, name='admin-users'),
    path('admin/users/<uuid:uuid>/status/', admin_user_toggle_status, name='admin-user-status'),
    path('admin/hospitals/', admin_hospitals_list_create, name='admin-hospitals'),
    path('admin/hospitals/<uuid:uuid>/', admin_hospital_detail_update, name='admin-hospital-detail'),
    path('admin/ambulances/', admin_ambulances_list_create, name='admin-ambulances'),
    path('admin/ambulances/<uuid:uuid>/', admin_ambulance_detail_update, name='admin-ambulance-detail'),
    path('admin/cases/', admin_cases_overview, name='admin-cases'),
    path('admin/analytics/', admin_analytics_data, name='admin-analytics'),
    path('admin/activity/', admin_activity_logs, name='admin-activity'),
    path('admin/models/', admin_models_info, name='admin-models'),
    path('admin/settings/', admin_settings_config, name='admin-settings'),
]
