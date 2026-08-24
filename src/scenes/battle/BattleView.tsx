
import * as React from 'react';

import classNames from './battle.module.css';
import { Battle } from './Battle';
import { observer } from 'mobx-react-lite';
import { Window } from './Window';
import { Meter } from './Meter';
import { Combatant } from '../../model/combatant';
import { MenuOptionsView } from './MenuOptionsView';
import { EnemyCombatant } from '../../model/enemyCombatant';
import { PileType } from './battleStore';
import { toJS } from 'mobx';
import { Card } from '../../model/card';

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
  <div>
      <CombatantView battle={battle} combatant={enemyCombatant} />
      <div>Intent: </div>
  </div>

  )
});

export const PlayerContainer = observer((props: { battle: Battle }): JSX.Element => {
  const { battle } = props;
  const { playerCombatant } = battle.store;

  return (
    <div className={classNames.playerContainer}>
      <CombatantView battle={battle} combatant={playerCombatant} />
      <div>Energy: {playerCombatant.energy} / {playerCombatant.maxEnergy}</div>
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
          <div style={{ display: 'flex', justifyContent: 'space-between'}}>
            <div>{combatant.health} / {combatant.maxHealth}</div>
            <div style={{ marginLeft: '8px'}}>Block: { combatant.block }</div>
          </div>
        </div>
        <div>
          art here
        </div>
    </Window>
  )
});

export const Piles = observer((props: { battle: Battle }): JSX.Element => {
  const { battle } = props;

  const piles = {
      hand: battle.store.playerCombatant.hand,
      deck: battle.store.playerCombatant.deck,
      discard: battle.store.playerCombatant.discard,
      exhaust: battle.store.playerCombatant.exhaust,
  };


  const onClickPile = (pile) => {
    battle.store.setSelectedPile(pile);
    battle.selectPile(pile);
  }

  const onClickCardIndex = (index) => {
    battle.selectCardIndex(index);
  }

  const selectedCards = piles[battle.store.selectedPile];
  console.log(toJS(selectedCards)); // loading bearing console statement... triggers mobx to observe the cards lol

  return (
    <div className={classNames.cardsContainer}>

        <div className={classNames.pileSelector}>
            <MenuOptionsView
              items={Object.values(PileType)}
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
              renderLabel={(card: Card) => (
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%'}}>
                    <div>{card.name}</div>
                    <div>{card.cost}</div>
                  </div>
              )}
              onSelect={(card, idx) => onClickCardIndex(idx)}
            />
        </div>

        <SelectedCard battle={battle} />
    </div>
  );
});

export const SelectedCard = observer((props: { battle: Battle }): JSX.Element => {
  const { battle } = props; 
  if (battle.store.selectedCardIndex === null) return <div className={classNames.selectedCard}></div>;
  const selectedCard = battle.store.playerCombatant.hand[battle.store.selectedCardIndex];

  return (
    <div className={classNames.selectedCard}>
      { selectedCard.name }
      { selectedCard.effects.map(effect => <div>{effect.description}</div>) }
    </div>
  );
});
