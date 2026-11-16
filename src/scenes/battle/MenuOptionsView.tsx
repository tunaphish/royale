
import * as React from 'react';
import { motion } from 'framer-motion';

import cursorUrl from '../../assets/images/ui/cursor.png';

export const MenuCursor = (props: { size: number }): JSX.Element => (
  <motion.img
    src={cursorUrl}
    alt=""
    style={{
      width: props.size + 'px',       
      imageRendering: 'pixelated',
      position: 'absolute',
      left: - + props.size/2 + 'px',
      top: '10%',
    }}
    initial={{ opacity: 0, x: 4 }}
    animate={{
      opacity: 1,
      x: [0, -4, 0],
    }}
    transition={{
      x: {
        repeat: Infinity,
        duration: 0.6,
        ease: 'easeInOut',
      },
      opacity: { duration: 0.15 },
    }}
  />
);

type MenuOptionsViewProps<T> = {
  items: T[]
  getKey: (item: T) => string
  renderLabel: (item: T) => React.ReactNode
  onSelect: (item: T, index: number) => void
  initialIndex?: number
}

export const MenuOptionsView = <T,>({items,getKey,renderLabel,onSelect,initialIndex = -1}: MenuOptionsViewProps<T>): JSX.Element => {
  const [selectedIndex, setSelectedIndex] = React.useState(initialIndex)

  return (
    <>
      {items.map((item, i) => (
        <div
          key={getKey(item) + i}
          onClick={() => {
            setSelectedIndex(i)
            onSelect(item, i)
          }}
          style={{ position: 'relative', display: 'flex' }}
        >
          {i === selectedIndex && <MenuCursor size={24} />}
          {renderLabel(item)}
        </div>
      ))}
    </>
  )
}