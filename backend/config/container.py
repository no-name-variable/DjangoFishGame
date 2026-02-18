"""DI-контейнер приложения (punq)."""

import punq


def _build_container() -> punq.Container:
    from apps.fishing.services.bite_calculator import BiteCalculatorService
    from apps.fishing.services.fight_engine import FightEngineService
    from apps.fishing.services.fish_selector import FishSelectorService
    from apps.fishing.services.time_service import TimeService
    from apps.fishing.use_cases.cast import CastUseCase
    from apps.fishing.use_cases.change_bait import ChangeBaitUseCase
    from apps.fishing.use_cases.fight import PullRodUseCase, ReelInUseCase
    from apps.fishing.use_cases.groundbait import ApplyGroundbaitUseCase
    from apps.fishing.use_cases.keep_fish import KeepFishUseCase
    from apps.fishing.use_cases.release_fish import ReleaseFishUseCase
    from apps.fishing.use_cases.retrieve import RetrieveRodUseCase
    from apps.fishing.use_cases.status import FishingStatusUseCase
    from apps.fishing.use_cases.strike import StrikeUseCase
    from apps.bazaar.use_cases.buy_listing import BuyListingUseCase
    from apps.bazaar.use_cases.cancel_listing import CancelListingUseCase
    from apps.bazaar.use_cases.create_listing import CreateListingUseCase
    from apps.cafe.use_cases.deliver_fish import DeliverFishUseCase
    from apps.cafe.use_cases.get_orders import GetCafeOrdersUseCase
    from apps.home.services import MoonshineService
    from apps.home.use_cases.buy_ingredient import BuyIngredientUseCase
    from apps.home.use_cases.collect_moonshine import CollectMoonshineUseCase
    from apps.home.use_cases.start_brewing import StartBrewingUseCase
    from apps.inspection.services import InspectionService
    from apps.inventory.use_cases.assemble_rod import AssembleRodUseCase
    from apps.inventory.use_cases.change_tackle import ChangeTackleUseCase
    from apps.inventory.use_cases.delete_rod import DeleteRodUseCase
    from apps.inventory.use_cases.disassemble_rod import DisassembleRodUseCase
    from apps.inventory.use_cases.eat import EatUseCase
    from apps.inventory.use_cases.equip_rod import EquipRodUseCase
    from apps.inventory.use_cases.unequip_rod import UnequipRodUseCase
    from apps.potions.services import PotionService
    from apps.potions.use_cases.craft_potion import CraftPotionUseCase
    from apps.quests.services import QuestService
    from apps.quests.use_cases.accept_quest import AcceptQuestUseCase
    from apps.quests.use_cases.claim_reward import ClaimQuestRewardUseCase
    from apps.records.services import RecordService
    from apps.shop.use_cases.buy_item import BuyItemUseCase
    from apps.shop.use_cases.sell_fish import SellFishUseCase
    from apps.teams.use_cases.create_team import CreateTeamUseCase
    from apps.teams.use_cases.join_team import JoinTeamUseCase
    from apps.teams.use_cases.leave_team import LeaveTeamUseCase
    from apps.tournaments.services import TournamentService
    from apps.tournaments.use_cases.create_tournament import CreateTournamentUseCase
    from apps.tournaments.use_cases.join_tournament import JoinTournamentUseCase

    container = punq.Container()

    # Сервисы без зависимостей
    container.register(TimeService)
    container.register(PotionService)
    container.register(MoonshineService)
    container.register(FightEngineService)
    container.register(RecordService)
    container.register(QuestService)
    container.register(TournamentService)
    container.register(InspectionService)

    # Сервисы с зависимостями
    container.register(BiteCalculatorService)
    container.register(FishSelectorService)

    # Use cases — fishing
    container.register(CastUseCase)
    container.register(RetrieveRodUseCase)
    container.register(ReleaseFishUseCase)
    container.register(KeepFishUseCase)
    container.register(ReelInUseCase)
    container.register(PullRodUseCase)
    container.register(StrikeUseCase)
    container.register(FishingStatusUseCase)
    container.register(ApplyGroundbaitUseCase)
    container.register(ChangeBaitUseCase)

    # Use cases — inventory
    container.register(AssembleRodUseCase)
    container.register(DisassembleRodUseCase)
    container.register(ChangeTackleUseCase)
    container.register(EquipRodUseCase)
    container.register(UnequipRodUseCase)
    container.register(EatUseCase)
    container.register(DeleteRodUseCase)

    # Use cases — tournaments
    container.register(CreateTournamentUseCase)
    container.register(JoinTournamentUseCase)

    # Use cases — potions
    container.register(CraftPotionUseCase)

    # Use cases — quests
    container.register(AcceptQuestUseCase)
    container.register(ClaimQuestRewardUseCase)

    # Use cases — teams
    container.register(CreateTeamUseCase)
    container.register(JoinTeamUseCase)
    container.register(LeaveTeamUseCase)

    # Use cases — shop
    container.register(BuyItemUseCase)
    container.register(SellFishUseCase)

    # Use cases — bazaar
    container.register(CreateListingUseCase)
    container.register(BuyListingUseCase)
    container.register(CancelListingUseCase)

    # Use cases — cafe
    container.register(GetCafeOrdersUseCase)
    container.register(DeliverFishUseCase)

    # Use cases — home
    container.register(BuyIngredientUseCase)
    container.register(StartBrewingUseCase)
    container.register(CollectMoonshineUseCase)

    return container


container = _build_container()
