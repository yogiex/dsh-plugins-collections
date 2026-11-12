import React from 'react';
import { Composition } from 'remotion';
import { HelloWorld, type HelloWorldProps } from './HelloWorld';
import { PromptVideo, type PromptVideoProps } from './PromptVideo';

const helloProps: HelloWorldProps = {
  title: 'Hello, Remotion',
  subtitle: 'React components rendered to video, straight from DeepSeek Harness.',
  badge: 'Remotion × DSH',
};

const promptProps: PromptVideoProps = {
  prompt: 'Tulis prompt di panel Remotion, lalu tekan Render untuk melihat hasilnya sebagai video.',
};

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition<typeof PromptVideo, PromptVideoProps>
        id="PromptVideo"
        component={PromptVideo}
        durationInFrames={120}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={promptProps}
      />
      <Composition<typeof HelloWorld, HelloWorldProps>
        id="HelloWorld"
        component={HelloWorld}
        durationInFrames={90}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={helloProps}
      />
    </>
  );
};
