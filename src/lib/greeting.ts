export interface GreetingResult {
  main: string;
  sub: string;
}

export function getGreeting(firstName?: string | null): GreetingResult {
  const hour = new Date().getHours();
  const name = firstName || 'there';
  if (hour >= 5 && hour < 12) return { main: `Good morning, ${name}.`, sub: "What are we studying today?" };
  if (hour >= 12 && hour < 17) return { main: `Good afternoon, ${name}.`, sub: "Ready to get into it?" };
  if (hour >= 17 && hour < 21) return { main: `Good evening, ${name}.`, sub: "Let's make this session count." };
  return { main: `Still at it, ${name}.`, sub: "Let's go." };
}
