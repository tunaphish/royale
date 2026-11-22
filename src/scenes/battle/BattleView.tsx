
import * as React from 'react';

import classNames from './battle.module.css';
import { Battle } from './Battle';
import { observer } from 'mobx-react-lite';
import { Window } from './Window';
import { Meter } from './Meter';
import { ActiveTechnique, Combatant } from '../../model/combatant';
import { MenuOptionsView } from './MenuOptionsView';
import { EnemyCombatant } from '../../model/enemyCombatant';
import { PileType } from './battleStore';
import { toJS } from 'mobx';
import { CardInstance, cardDef } from '../../data/cards';

export const BattleView = observer((props: { battle: Battle }): JSX.Element => {
  const { battle } = props;

  return (
    <div className={classNames.container}>
      <EnemyContainer battle={battle} />
      <PlayerContainer battle={battle} />
      <CardSelector battle={battle} />
      <PileSelector battle={battle}/>
    </div>
  )
});

export const EnemyContainer = observer((props: { battle: Battle }): JSX.Element => {
  const { battle } = props;
  return (
    <div className={classNames.enemyContainer}>
      { battle.store.enemyCombatants.map((enemyCombatant, idx) => <EnemyView battle={battle} enemyCombatant={enemyCombatant} key={idx}/>)}
    </div>
  )
});

export const EnemyView = observer((props: { battle: Battle, enemyCombatant: EnemyCombatant }): JSX.Element => {
  const { battle, enemyCombatant } = props;
  console.log(toJS(enemyCombatant));
  return (
    <div style={{ width: "50%"}}>
        <CombatantView battle={battle} combatant={enemyCombatant} isPlayer={false}/>
        <div>Intent: {enemyCombatant.states[enemyCombatant.stateIndex].effects.map(effect => effect.description).join(", ")}</div>
    </div>

  )
});

export const PlayerContainer = observer((props: { battle: Battle }): JSX.Element => {
  const { battle } = props;
  const { playerCombatant } = battle.store;

  return (
    <div className={classNames.playerContainer}>
      <CombatantView battle={battle} combatant={playerCombatant} isPlayer/>
      <div>Energy: {playerCombatant.energy} / {playerCombatant.maxEnergy}</div>
    </div>
  )
});

export const CombatantView = observer((props: { battle: Battle, combatant: Combatant, isPlayer: boolean }): JSX.Element => { 
  const { battle, combatant, isPlayer } = props;
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
          { combatant.activeTechniques.map((activeTechnique, idx) => <TechniqueView key={activeTechnique.technique.name} battle={battle} activeTechnique={activeTechnique} idx={idx} isPlayer={isPlayer}/>) }
        </div>
    </Window>
  )
});

export const TechniqueView  = observer((props: { battle: Battle, activeTechnique: ActiveTechnique, idx: number, isPlayer: boolean }): JSX.Element => { 
  // battle, idx and isPlayer are for sacrificing a technique (commented out below)
  const { activeTechnique } = props;

  // const onClickTechnique = () => {
  //   if (!isPlayer) return;
  //   battle.sacrificeTechniqueIndex(idx);
  // }

  return (
    <div>{activeTechnique.technique.name} {activeTechnique.amount}</div>
  )
});

export const CardSelector = observer((props: { battle: Battle }): JSX.Element => {
  const { battle } = props;

  const onClickCardIndex = (index: number) => {
    battle.selectCardIndex(index);
  }

  const selectedCards = battle.store.playerCombatant[battle.store.selectedPile];
  console.log(toJS(selectedCards)); // loading bearing console statement... triggers mobx to observe the cards lol

  return (
    <div className={classNames.cardsContainer}>
        <div className={classNames.cardSelector}>
            <MenuOptionsView
              items={selectedCards}
              getKey={card => card.uid}
              renderLabel={(card: CardInstance) => (
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%'}}>
                    <div>{cardDef(card).name}</div>
                    <div>{cardDef(card).cost}</div>
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
  const { selectedCard } = battle.store;
  if (!selectedCard) return <div className={classNames.selectedCard}></div>;
  const card = cardDef(selectedCard);

  return (
    <div className={classNames.selectedCard}>
      { card.name }
      { card.effects.map((effect, idx) => <div key={idx}>{effect.description}</div>) }
    </div>
  );
});

export const PileSelector = observer((props: { battle: Battle }): JSX.Element => {
  const { battle } = props;
  const piles = {
    deck: battle.store.playerCombatant.deck,
    hand: battle.store.playerCombatant.hand,
    discard: battle.store.playerCombatant.discard,
  };

  const onClickPile = (pile: PileType) => {
    battle.selectPile(pile);
  }

  const onClickEndTurn = () => {
    battle.endTurn();
  }

  return (
    <div className={classNames.pileSelector}>
      <MenuOptionsView
        items={Object.values(PileType)}
        getKey={pile => pile}
        renderLabel={pile => pile + ' ' + '(' + piles[pile].length + ')'}
        onSelect={pile => onClickPile(pile)}
        initialIndex={0}
      />
      <div onClick={onClickEndTurn}>End Turn</div>
  </div>
  )
});