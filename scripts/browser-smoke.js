// Run through: npx playwright-cli -s=lifeos run-code --filename=scripts/browser-smoke.js
async (page) => {
  const results = [];
  const routes = [
    ['/area/academic', 'Less mental clutter. More room to learn.'],
    ['/area/skills', 'Build the person you want to become.'],
    ['/area/projects', 'Give your ideas a place to grow.'],
    ['/area/free', 'Your open windows. Your choice.'],
    ['/area/fitness', 'Movement that fits into your life.'],
    ['/area/diet', 'A little awareness, meal by meal.'],
    ['/area/habits', 'Consistency has many colours.'],
    ['/calendar', 'Your time, in view.'],
    ['/capture', 'Get it out of your head.'],
    ['/me', 'The bigger picture.'],
    ['/tasks', 'Everything on your mind.'],
  ];
  for (const [route, title] of routes) {
    await page.goto('http://localhost:8081' + route);
    await page.getByText(title, {exact: true}).waitFor();
    results.push({route, visible: await page.getByText(title, {exact: true}).isVisible()});
  }
  console.log(JSON.stringify(results));
}
