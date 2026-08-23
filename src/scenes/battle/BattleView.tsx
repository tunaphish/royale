
import * as React from 'react';

import classNames from './battle.module.css';
import { Battle } from './Battle';
import { observer } from 'mobx-react-lite';
import { Card } from '../../model/card';
import { Window } from './Window';
import { Meter } from './Meter';
import { Combatant } from '../../model/combatant';

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
      { battle.store.enemyCombatants.map(enemyCombatant => <CombatantView battle={battle} combatant={enemyCombatant} />)}
    </div>
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
  return (
      <Window style={{ width: "50%", }}>
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

  const onClick = (pile) => {
    setSelectedPile(pile)
    battle.selectPile(pile);
  }

  const selectedCards = piles[selectedPile];
  return (
    <div className={classNames.cardsContainer}>

        <div className={classNames.pileSelector}>
            {(['hand', 'deck', 'discard', 'exhaust'] as const).map(pile => (
                <div
                    key={pile}
                    onClick={() => onClick(pile)}
                    style={{
                      fontWeight: selectedPile === pile ? 'bold' : 'normal',
                    }}
                >
                    {pile.charAt(0).toUpperCase() + pile.slice(1)}
                    {' '}({piles[pile].length})
                </div>
            ))}
        </div>

        <div className={classNames.cardSelector}>
            {selectedCards.map((card, index) => <CardSelection key={index} battle={battle} card={card} />)}
        </div>

        <SelectedCard battle={battle} />
    </div>
  );
});

export const CardSelection = observer((props: { battle: Battle, card: Card }): JSX.Element => {
  const { battle, card } = props; 

  const onClick = () => {
    battle.selectCard(card);
  }

  return (
    <div onClick={onClick}>
      {card.name}
    </div>
  );
});

export const SelectedCard = observer((props: { battle: Battle }): JSX.Element => {
  const { battle } = props; 
  if (!battle.store.selectedCard) return null;
  const { selectedCard } = battle.store;
  

  return (
    <div className={classNames.selectedCard}>
      {selectedCard.name}
      { selectedCard.effects.map(effect => <div>{effect.descriptionTemplate}</div>) }
    </div>
  );
});
