
import * as React from 'react';

import classNames from './battle.module.css';
import { Battle } from './Battle';
import { observer } from 'mobx-react-lite';

export const BattleView = observer((props: { battle: Battle }): JSX.Element => {
  const { battle: battle } = props
  return (
    <div className={classNames.container}>
      hi i'm battle
    </div>
  )
});
