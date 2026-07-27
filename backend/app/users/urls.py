from django.urls import path
from .views import (
    CurrentUserView,
    LoginView,
    LogoutView,
    RegisterView,
    TokenRefreshView,
    UserActivateView,
    UserDeactivateView,
    UserDeleteView,
    UserDetailView,
    UserListView,
)

urlpatterns = [
    path('users/', UserListView.as_view(), name='user-list'),
    path('users/<int:pk>/', UserDetailView.as_view(), name='user-detail'),
    path('users/register/', RegisterView.as_view(), name='user-register'),
    path('auth/login/', LoginView.as_view(), name='auth-login'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='auth-token-refresh'),
    path('auth/me/', CurrentUserView.as_view(), name='auth-me'),
    path('auth/logout/', LogoutView.as_view(), name='auth-logout'),
    path("users/<int:pk>/delete/", UserDeleteView.as_view(), name="user-delete"),
    path("users/<int:pk>/deactivate/", UserDeactivateView.as_view(), name="user-deactivate"),
    path("users/<int:pk>/activate/", UserActivateView.as_view(), name="user-activate"),
]
