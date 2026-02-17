"""Views команд."""

from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Team, TeamMembership
from .serializers import CreateTeamSerializer, TeamDetailSerializer, TeamSerializer
from .use_cases.create_team import CreateTeamUseCase
from .use_cases.join_team import JoinTeamUseCase
from .use_cases.leave_team import LeaveTeamUseCase


def _resolve(use_case_cls):
    """Резолвит use case из DI-контейнера."""
    from config.container import container
    return container.resolve(use_case_cls)


class TeamListView(generics.ListAPIView):
    """Список всех команд."""

    serializer_class = TeamSerializer
    queryset = Team.objects.select_related('leader').all()


class TeamDetailView(generics.RetrieveAPIView):
    """Детали команды с участниками."""

    serializer_class = TeamDetailSerializer
    queryset = Team.objects.prefetch_related('memberships__player').select_related('leader')


class CreateTeamView(APIView):
    """Создать команду."""

    def post(self, request):
        serializer = CreateTeamSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        uc = _resolve(CreateTeamUseCase)
        try:
            team = uc.execute(
                request.user.player,
                name=serializer.validated_data['name'],
                description=serializer.validated_data.get('description', ''),
            )
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(TeamSerializer(team).data, status=status.HTTP_201_CREATED)


class JoinTeamView(APIView):
    """Вступить в команду."""

    def post(self, request, pk):
        uc = _resolve(JoinTeamUseCase)
        try:
            uc.execute(request.user.player, pk)
        except Team.DoesNotExist:
            return Response({'error': 'Команда не найдена.'}, status=status.HTTP_404_NOT_FOUND)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        team = Team.objects.get(pk=pk)
        return Response({'message': f'Вы вступили в команду "{team.name}".'})


class LeaveTeamView(APIView):
    """Покинуть команду."""

    def post(self, request):
        uc = _resolve(LeaveTeamUseCase)
        try:
            result = uc.execute(request.user.player)
        except ValueError as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

        return Response({'message': result.message})


class MyTeamView(APIView):
    """Моя команда."""

    def get(self, request):
        player = request.user.player
        membership = TeamMembership.objects.filter(player=player).select_related('team').first()
        if not membership:
            return Response({'team': None})
        team = Team.objects.prefetch_related('memberships__player').select_related('leader').get(pk=membership.team_id)
        return Response(TeamDetailSerializer(team).data)
