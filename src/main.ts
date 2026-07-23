import p5 from 'p5';

const sketch = (p: p5) => {
  p.setup = () => {
    p.createCanvas(p.windowWidth, p.windowHeight);
  };

  p.draw = () => {
    p.background(20);
    p.fill(255);
    p.noStroke();
    p.circle(
      p.width / 2 + p.cos(p.frameCount * 0.02) * 100,
      p.height / 2 + p.sin(p.frameCount * 0.02) * 100,
      40
    );
  };

  p.windowResized = () => {
    p.resizeCanvas(p.windowWidth, p.windowHeight);
  };
};

new p5(sketch);
