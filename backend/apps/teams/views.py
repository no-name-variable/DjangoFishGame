"""Views команд."""

from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Team, TeamMembership
from .serializers import CreateTeamSerializer, TeamDetailSerializer, TeamSerializer


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
        player = request.user.player

        if TeamMembership.objects.filter(player=player).exists():
            return Response({'error': 'Вы уже состоите в команде.'}, status=status.HTTP_400_BAD_REQUEST)

        if Team.objects.filter(name=serializer.validated_data['name']).exists():
            return Response({'error': 'Команда с таким именем уже существует.'}, status=status.HTTP_400_BAD_REQUEST)

        team = Team.objects.create(
            name=serializer.validated_data['name'],
            description=serializer.validated_data.get('description', ''),
            leader=player,
        )
        TeamMembership.objects.create(team=team, player=player, role=TeamMembership.Role.LEADER)

        return Response(TeamSerializer(team).data, status=status.HTTP_201_CREATED)


class JoinTeamView(APIView):
    """Вступить в команду."""

    def post(self, request, pk):
        player = request.user.player

        if TeamMembership.objects.filter(player=player).exists():
            return Response({'error': 'Вы уже состоите в команде.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            team = Team.objects.get(pk=pk)
        except Team.DoesNotExist:
            return Response({'error': 'Команда не найдена.'}, status=status.HTTP_404_NOT_FOUND)

        if team.member_count >= team.max_members:
            return Response({'error': 'Команда полная.'}, status=status.HTTP_400_BAD_REQUEST)

        TeamMembership.objects.create(team=team, player=player)
        return Response({'message': f'Вы вступили в команду "{team.name}".'})


class LeaveTeamView(APIView):
    """Покинуть команду."""

    def post(self, request):
        player = request.user.player
        membership = TeamMembership.objects.filter(player=player).first()
        if not membership:
            return Response({'error': 'Вы не состоите в команде.'}, status=status.HTTP_400_BAD_REQUEST)

        if membership.role == TeamMembership.Role.LEADER:
            team = membership.team
            # Передать лидерство или удалить команду
            next_leader = TeamMembership.objects.filter(
                team=team,
            ).exclude(player=player).order_by('joined_at').first()
            if next_leader:
                next_leader.role = TeamMembership.Role.LEADER
                next_leader.save(update_fields=['role'])
                team.leader = next_leader.player
                team.save(update_fields=['leader'])
            else:
                team.delete()
                return Response({'message': 'Команда распущена.'})

        membership.delete()
        return Response({'message': 'Вы покинули команду.'})


class MyTeamView(APIView):
    """Моя команда."""

    def get(self, request):
        player = request.user.player
        membership = TeamMembership.objects.filter(player=player).select_related('team').first()
        if not membership:
            return Response({'team': None})
        team = Team.objects.prefetch_related('memberships__player').select_related('leader').get(pk=membership.team_id)
        return Response(TeamDetailSerializer(team).data)
