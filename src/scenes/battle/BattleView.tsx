
import * as React from 'react';

import classNames from './battle.module.css';
import { Battle } from './Battle';
import { observer } from 'mobx-react-lite';
import { Card } from '../../model/card';

export const BattleView = observer((props: { battle: Battle }): JSX.Element => {
  const { battle } = props;

  return (
    <div className={classNames.container}>
      <div className={classNames.enemyContainer} />
      <div className={classNames.playerContainer} />
      <Piles battle={battle} />
    </div>
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
