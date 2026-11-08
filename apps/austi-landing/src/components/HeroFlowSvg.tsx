import { useId, type CSSProperties } from 'react';

import { heroContent } from '../lib/landing-content';

import './HeroFlowSvg.css';

const feeds = [
  'M100 466C80 350 275 330 500 230',
  'M210 446C200 350 350 320 500 230',
  'M330 442C310 340 430 310 500 230',
  'M665 445C690 350 570 310 500 230',
  'M800 448C830 325 650 315 500 230',
  'M925 466C980 325 700 285 500 230',
];

const channels = [
  {
    x: 630,
    y: 50,
    path: 'M500 230C550 230 550 74 630 74',
    icon: 'm3 7 12-4v12L3 11Zm2 5 2 5h3l-2-5M15 7h3m-3 4h3',
  },
  {
    x: 710,
    y: 155,
    path: 'M500 230C600 230 600 179 710 179',
    icon: 'M17 9a7 7 0 0 1-7 7H5l-3 2V9a7.5 7.5 0 0 1 15 0ZM6 8h7M6 11h4',
  },
  { x: 650, y: 260, path: 'M500 230C570 230 570 284 650 284', icon: 'M2 4h16v12H2Zm0 1 8 6 8-6' },
  {
    x: 710,
    y: 365,
    path: 'M500 230C585 230 575 389 710 389',
    icon: 'M13 8a5 5 0 1 1-10 0 5 5 0 0 1 10 0Zm-1 4 6 6',
  },
];

export function HeroFlowSvg() {
  const prefix = `hero-flow-${useId().replace(/:/g, '')}`;
  const particle = (path: string, start: number, end: number) => (
    <g className='flow-particle' opacity='0'>
      <circle r='7' fill={`url(#${prefix}-particle)`} stroke='none' />
      <circle r='2' fill='var(--color-white)' stroke='none' />
      <animateMotion
        data-flow-motion
        begin='indefinite'
        dur='9s'
        repeatCount='indefinite'
        calcMode='linear'
        keyPoints='0;0;1;1'
        keyTimes={`0;${start.toFixed(3)};${end.toFixed(3)};1`}
      >
        <mpath href={`#${path}`} />
      </animateMotion>
      <animate
        data-flow-motion
        attributeName='opacity'
        begin='indefinite'
        dur='9s'
        repeatCount='indefinite'
        values='0;0;1;1;0;0'
        keyTimes={`0;${start.toFixed(3)};${(start + 0.02).toFixed(3)};${end.toFixed(3)};${(end + 0.02).toFixed(3)};1`}
      />
    </g>
  );

  return (
    <svg
      className='hero-flow'
      data-hero-flow
      viewBox='0 0 1000 700'
      preserveAspectRatio='xMidYMax meet'
      width='1000'
      height='700'
      role='img'
      aria-label={heroContent.scene.flowLabel}
    >
      <defs>
        <linearGradient id={`${prefix}-line`} x1='0' y1='1' x2='0' y2='0'>
          <stop stopColor='var(--color-muted-dark)' stopOpacity='.18' />
          <stop offset='1' stopColor='var(--color-white)' stopOpacity='.5' />
        </linearGradient>
        <radialGradient id={`${prefix}-particle`}>
          <stop stopColor='var(--color-white)' stopOpacity='.7' />
          <stop offset='1' stopColor='var(--color-white)' stopOpacity='0' />
        </radialGradient>
        <filter id={`${prefix}-glow`} x='-60%' y='-60%' width='220%' height='220%'>
          <feGaussianBlur stdDeviation='5' />
        </filter>
      </defs>
      <g
        aria-hidden='true'
        fill='none'
        stroke={`url(#${prefix}-line)`}
        strokeWidth='1.25'
        strokeLinecap='round'
        vectorEffect='non-scaling-stroke'
      >
        {feeds.map((path, index) => (
          <g key={path}>
            <path id={`${prefix}-feed-${index}`} d={path} vectorEffect='non-scaling-stroke' />
            {particle(`${prefix}-feed-${index}`, 0.04 + index * 0.02, 0.3 + index * 0.02)}
          </g>
        ))}
        {channels.map((channel, index) => (
          <g key={channel.path}>
            <path
              id={`${prefix}-branch-${index}`}
              d={channel.path}
              vectorEffect='non-scaling-stroke'
            />
            {particle(`${prefix}-branch-${index}`, 0.42 + index * 0.055, 0.6 + index * 0.055)}
          </g>
        ))}
      </g>
      <g className='flow-core' transform='translate(500 230)' aria-hidden='true'>
        <g className='flow-core-mark'>
          <circle
            className='flow-halo'
            r='38'
            fill='var(--color-white)'
            opacity='.15'
            stroke='none'
            filter={`url(#${prefix}-glow)`}
          />
          <circle
            className='flow-ring'
            r='42'
            fill='none'
            stroke='var(--color-white)'
            strokeWidth='1'
            opacity='.2'
          />
          <circle
            r='30'
            fill='var(--color-night)'
            stroke='var(--color-muted-dark)'
            strokeWidth='1'
          />
          <image href='/austi-logo.svg' x='-12' y='-13' width='24' height='26' />
        </g>
        <text className='flow-core-name' y='64' textAnchor='middle'>
          {heroContent.product}
        </text>
      </g>
      {channels.map((channel, index) => (
        <g key={channel.path} transform={`translate(${channel.x} ${channel.y})`} aria-hidden='true'>
          <g
            className='flow-channel'
            style={{ '--channel-delay': `${index * 0.495}s` } as CSSProperties}
          >
            <g className='flow-node-card'>
              <rect
                width='150'
                height='48'
                rx='8'
                fill='var(--color-night)'
                stroke='var(--color-muted-paper)'
                strokeWidth='1'
              />
              <path
                d={channel.icon}
                transform='translate(12 14)'
                stroke='var(--color-muted-dark)'
                strokeWidth='1.25'
                fill='none'
              />
              <text x='40' y='25' dominantBaseline='middle'>
                {heroContent.scene.channels[index]}
              </text>
              <g transform='translate(133 24)'>
                <g className='flow-approve'>
                  <circle r='8' fill='var(--color-text)' stroke='none' />
                  <path
                    d='m-3.5 0 2.5 2.5 4.5-5'
                    stroke='var(--color-ink)'
                    strokeWidth='1.5'
                    fill='none'
                  />
                </g>
              </g>
            </g>
          </g>
        </g>
      ))}
    </svg>
  );
}
