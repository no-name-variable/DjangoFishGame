"""URL-конфигурация проекта."""

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('apps.accounts.urls')),
    path('api/', include('apps.world.urls')),
    path('api/', include('apps.shop.urls')),
    path('api/', include('apps.inventory.urls')),
    path('api/', include('apps.fishing.urls')),
    path('api/', include('apps.quests.urls')),
    path('api/', include('apps.records.urls')),
    path('api/', include('apps.tournaments.urls')),
    path('api/', include('apps.teams.urls')),
    path('api/', include('apps.potions.urls')),
    path('api/', include('apps.inspection.urls')),
    path('api/', include('apps.bazaar.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
