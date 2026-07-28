import type {
  DivineSkillDefinition,
  DivineSkillId,
} from "../divine/skillTypes";

export const DIVINE_SKILL_DEFINITIONS: Readonly<
  Record<DivineSkillId, DivineSkillDefinition>
> = {
  meteor_fall: {
    id: "meteor_fall",
    name: "Meteor Fall",
    description:
      "Call down 140 damage with linear falloff. Divine wrath also deals 40 damage to your own towers in the blast.",
    cost: 55,
    cooldownTicks: 240,
    radius: 120,
    color: "#f06b3e",
    targeted: true,
  },
  sanctuary: {
    id: "sanctuary",
    name: "Sanctuary",
    description:
      "Heal allied agents inside by 60 and prevent them from breaking for 200 ticks.",
    cost: 45,
    cooldownTicks: 300,
    radius: 150,
    color: "#7ed6a5",
    targeted: true,
  },
  chains_of_dusk: {
    id: "chains_of_dusk",
    name: "Chains of Dusk",
    description:
      "Root enemies inside for 120 ticks and deal 20 damage. Rooted enemies can still attack.",
    cost: 40,
    cooldownTicks: 260,
    radius: 130,
    color: "#8e73d1",
    targeted: true,
  },
  resurgence: {
    id: "resurgence",
    name: "Resurgence",
    description:
      "Revive 8 fallen agents at their banners or the keep and return every dead hero.",
    cost: 70,
    cooldownTicks: 600,
    radius: 0,
    color: "#f3d37a",
    targeted: false,
  },
} as const;
