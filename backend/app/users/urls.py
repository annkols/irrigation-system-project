from django.urls import path
from .views import UserListView, UserDetailView, RegisterView, UserDeleteView, UserDeactivateView

urlpatterns = [
    path('users/', UserListView.as_view(), name='user-list'),
    path('users/<int:pk>/', UserDetailView.as_view(), name='user-detail'),
    path('users/register/', RegisterView.as_view(), name='user-register'),
    path("users/<int:pk>/delete/", UserDeleteView.as_view(), name="user-delete"),
    path("users/<int:pk>/deactivate/", UserDeactivateView.as_view(), name="user-deactivate"),
]