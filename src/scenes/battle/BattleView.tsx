
import * as React from 'react';

import classNames from './battle.module.css';
import { Battle } from './Battle';
import { observer } from 'mobx-react-lite';
import { Window } from './Window';
import { Meter } from './Meter';
import { Combatant } from '../../model/combatant';
import { MenuOptionsView } from './MenuOptionsView';
import { EnemyCombatant } from '../../model/enemyCombatant';

export const BattleView = observer((props: { battle: Battle }): JSX.Element => {
  const { battle } = props;

  return (
    <div className={classNames.container}>
      <EnemyContainer battle={battle} />
      <PlayerContainer battle={battle} />
      <Piles battle={battle} />
    </div>
  )
});

export const EnemyContainer = observer((props: { battle: Battle }): JSX.Element => {
  const { battle } = props;
  return (
    <div className={classNames.enemyContainer}>
      { battle.store.enemyCombatants.map(enemyCombatant => <EnemyView battle={battle} enemyCombatant={enemyCombatant} />)}
    </div>
  )
});

export const EnemyView = observer((props: { battle: Battle, enemyCombatant: EnemyCombatant }): JSX.Element => {
const { battle, enemyCombatant } = props;
return (
    <CombatantView battle={battle} combatant={enemyCombatant} />
  )
});

export const PlayerContainer = observer((props: { battle: Battle }): JSX.Element => {
  const { battle } = props;
  const { playerCombatant } = battle.store;

  return (
    <div className={classNames.playerContainer}>
      <CombatantView battle={battle} combatant={playerCombatant} />
    </div>
  )
});

export const CombatantView = observer((props: { battle: Battle, combatant: Combatant }): JSX.Element => { 
  const { battle, combatant } = props;
  const onClick = () => {
    battle.selectTarget(combatant);
  }

  return (
      <Window onClick={onClick}>
        <div className={classNames.meterContainer}>
          <Meter value={ combatant.health } max={ combatant.maxHealth }/>
          <div>{combatant.health} / {combatant.maxHealth}</div>
        </div>
        <div>
          art here
        </div>
    </Window>
  )
});

export const Piles = observer((props: { battle: Battle }): JSX.Element => {
  const { battle } = props;

  const [selectedPile, setSelectedPile] = React.useState<'hand' | 'deck' | 'discard' | 'exhaust'>('hand');

  const piles = {
      hand: battle.store.playerCombatant.hand,
      deck: battle.store.playerCombatant.deck,
      discard: battle.store.playerCombatant.discard,
      exhaust: battle.store.playerCombatant.exhaust,
  };

  const onClickPile = (pile) => {
    setSelectedPile(pile)
    battle.selectPile(pile);
  }

  const onClickCard = (card) => {
    battle.selectCard(card);
  }

  const pileItems = ['hand', 'deck', 'discard', 'exhaust'];

  const selectedCards = piles[selectedPile];
  return (
    <div className={classNames.cardsContainer}>

        <div className={classNames.pileSelector}>
            <MenuOptionsView
              items={pileItems}
              getKey={pile => pile}
              renderLabel={pile => pile + ' ' + '(' + piles[pile].length + ')'}
              onSelect={pile => onClickPile(pile)}
              initialIndex={0}
            />
        </div>

        <div className={classNames.cardSelector}>
            <MenuOptionsView
              items={selectedCards}
              getKey={card => card.name}
              renderLabel={card => card.name}
              onSelect={pile => onClickCard(pile)}
            />
        </div>

        <SelectedCard battle={battle} />
    </div>
  );
});



export const SelectedCard = observer((props: { battle: Battle }): JSX.Element => {
  const { battle } = props; 
  if (!battle.store.selectedCard) return null;
  const { selectedCard } = battle.store;
  

  return (
    <div className={classNames.selectedCard}>
      { selectedCard.name }
      { selectedCard.effects.map(effect => <div>{effect.descriptionTemplate}</div>) }
    </div>
  );
});
