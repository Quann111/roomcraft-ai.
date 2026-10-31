/**
 * Viglacera toilets offered in the sanitaryware tool (Business). Product photos live in public/products/viglacera/<file>.jpg
 * (on white, cropped square; sent to the model next to the bathroom photo) with <file>-thumb.jpg for the picker. `type` and
 * `look` were read from each photo by Gemini and drive the prompt; price and link are filled in when the supplier sends them.
 * The display name doubles as the `product` value.
 */
export const TOILET_BRAND = "Viglacera";
export type ToiletType = "one-piece" | "two-piece" | "wall-hung" | "smart";
// kids: a children's toilet, drawn at child size.
const LIST: { code: string; type: ToiletType; look: string; kids?: boolean; price?: number; url?: string }[] = [
  { code: "BL5", type: "one-piece", look: "An integrated upright tank with a top dual-flush button, an elongated bowl, and a skirted base with distinctive recessed side paneling" },
  { code: "BTE", type: "one-piece", kids: true, look: "Tall gently tapering seamless tank with a round top flush button, paired with a rounded bowl and a sculpted semi-contoured base" },
  { code: "BTEV", type: "one-piece", look: "A seamless one-piece toilet featuring a tall rounded-rectangular tank with a top-mounted dual flush button, fully skirted flat sides, and a sleek, contoured ultra-thin seat cover" },
  { code: "HL2", type: "one-piece", look: "One-piece toilet with a gently tapered rectangular tank, top-mounted dual flush button, and a fully skirted base with sweeping contoured side profile" },
  { code: "MK2", type: "one-piece", look: "Seamless one-piece construction with a tall rectangular tank featuring a top dual-flush button, a prominent rounded bowl, and a smooth semi-skirted base with flat sides" },
  { code: "P.11.320", type: "one-piece", look: "Seamless one-piece toilet with a tall tapered tank, top oval dual-flush button, fully skirted smooth bowl with a concave flared rear base, and an ultra-thin curved seat" },
  { code: "P.11.350", type: "one-piece", look: "Seamless one-piece toilet featuring a tall flat-front tank with a subtly curved lid and top button, completely skirted smooth base, and an ultra-slim seat with a distinct raised hinge bar" },
  { code: "P.11.450", type: "one-piece", look: "Seamless one-piece design featuring a fully skirted smooth base, a gently tapered tank with soft rounded edges, a top-mounted circular dual-flush button, and an ultra-slim profile seat cover" },
  { code: "P.12.600", type: "two-piece", look: "Tall rectangular tank with softly rounded edges and a top dual-flush button, mounted on a bowl featuring a skirted rear block, protruding rounded front bowl, and a slim contoured seat" },
  { code: "S301", type: "one-piece", look: "Tall rectangular tank with a softly contoured lid and top dual-flush button, integrated seamlessly into a smooth, semi-skirted base and rounded bowl" },
  { code: "S302", type: "one-piece", look: "Tall flat-front tank with a top dual-flush button, a fully skirted base with gently tapering sides, and a sleek ultra-thin seat cover" },
  { code: "S304", type: "one-piece", look: "Tall rectangular tank with rounded edges and top chrome flush button, seamless skirted base that contours inward under a rounded bowl, and a slim seat with an angled hinge casing" },
  { code: "S306", type: "one-piece", look: "A sleek one-piece toilet featuring a tall rectangular tank with a round top flush button, smooth fully skirted flat sides, and an elongated bowl with a slim seat" },
  { code: "S308", type: "one-piece", look: "Seamless one-piece toilet featuring a tall tank with a curved lid, round top flush button, and a fully skirted base with contoured side paneling paired with a flat D-shaped seat" },
  { code: "V199", type: "one-piece", look: "A seamless one-piece design featuring a tall, gently tapered rectangular tank with a top dual-flush button, fully skirted smooth base, and a slim, contoured soft-close seat lid" },
  { code: "V35M", type: "one-piece", look: "Tall seamless tank with an arched top lid and circular dual-flush button, featuring a fully skirted smooth base that tapers downward and a slim D-shaped seat cover" },
  { code: "V36", type: "one-piece", look: "Seamless one-piece design featuring a tall smoothly integrated tank with a top dual-flush button, a fully skirted base with gently flared sides, and an ultra-thin flat seat cover" },
  { code: "V37M", type: "one-piece", look: "A sleek one-piece design featuring a tall, softly rounded tank with a top dual-flush button and a smooth, fully skirted base that subtly tapers inward before flaring toward the floor" },
  { code: "V38M", type: "one-piece", look: "Tall one-piece toilet featuring a decorative wavy contour along the tank front, a dynamic curved skirt line along the base, and a round top-mount dual-flush button" },
  { code: "V39M", type: "one-piece", look: "A seamless one-piece toilet featuring a medium-height tank with a top dual-flush button and a skirted base accented by a distinctive sweeping, curved side contour" },
  { code: "V45M", type: "one-piece", look: "Tall rectangular tank seamlessly integrated into a fully skirted base with a gently flared front bowl, ultra-slim seat cover, and a top-mounted rectangular dual-flush button" },
  { code: "V62", type: "one-piece", look: "A seamless one-piece toilet with a fully skirted base that gently flares at the rear, a tall rectangular tank with a flat dual-flush top button, and an ultra-thin wrap-over seat cover" },
  { code: "V63", type: "one-piece", look: "Tall rectangular tank with rounded corners and a dual-flush top button, fully skirted seamless flat sides, and an ultra-thin flat seat lid" },
  { code: "V64", type: "one-piece", look: "Tall seamless tank with soft rectangular contours, a top rectangular dual-flush button, a fully skirted smooth base with a subtle waist, and a slim rounded-front lid" },
  { code: "V65", type: "one-piece", look: "Seamless one-piece design featuring a tall flat-front tank with a top round flush button, fully skirted smooth trapway base, and a slim contoured seat lid" },
  { code: "V68", type: "one-piece", look: "Seamless one-piece toilet featuring a tall, gently tapering tank with a top dual-flush button and a fully skirted, flat-sided base paired with a slim, rounded-rectangular seat" },
  { code: "V715", type: "two-piece", look: "Two-piece toilet with an upright rectangular tank, a side-mounted flush lever, an oval bowl, and an exposed, sculpted S-trapway along the base" },
  { code: "V716", type: "two-piece", look: "Tall slightly tapered rectangular tank set on a rounded bowl with a prominently contoured, exposed S-trapway base" },
  { code: "V72", type: "one-piece", look: "A seamless one-piece toilet featuring a tall flat-faced rectangular tank with a top dual-flush button, paired with an elegant skirted base that curves gently inward below an ultra-slim seat" },
  { code: "V803", type: "one-piece", look: "A seamless one-piece design featuring an upright rectangular tank with soft corners, a top circular dual-flush button, and a smoothly skirted, gently tapering base with a slim oval seat" },
  { code: "V808", type: "one-piece", look: "Seamless one-piece toilet featuring a rectangular flat-topped tank with a chrome dual-flush button, connected to a sculpted bowl with a flared pedestal base and a slim contoured lid" },
  { code: "V811", type: "one-piece", look: "Seamless one-piece design with an upright rectangular tank featuring rounded edges and a top dual-flush button, flowing into a fully skirted base with gentle side sculpting beneath an elongated bowl" },
  { code: "V816", type: "one-piece", look: "A seamless one-piece toilet featuring a tall rectangular tank with a flat dual-flush button on top, a D-shaped slim seat lid, and a fully skirted base with a slight waist indent below the bowl" },
  { code: "V817", type: "one-piece", look: "A seamless one-piece toilet featuring a gently curved tank lid with a top flush button, paired with a fully skirted, smoothly tapered base and an ultra-slim, softly squared seat cover" },
  { code: "V819", type: "one-piece", look: "A seamless one-piece toilet featuring a tall rectangular tank with a top dual-flush button, paired with an oval bowl, slim seat, and a smooth semi-skirted base with subtle sculpted side contours" },
  { code: "V823", type: "one-piece", look: "A seamless one-piece toilet featuring a medium-height tank with a top dual-flush button, a smooth fully skirted conical base, and a slim oval seat" },
  { code: "V825", type: "one-piece", look: "Integrated tall tank with a top dual-flush button, flared back base with a recessed side panel, and a semi-skirted bowl contour" },
  { code: "V829", type: "one-piece", look: "Seamless one-piece design featuring a fully skirted smooth base, a rounded rectangular tank with a top dual-flush button, and a slim flat seat lid" },
  { code: "V833", type: "one-piece", look: "A seamless one-piece design featuring a tall rectangular tank with softly rounded edges, a fully skirted smooth base with concealed trapway, and an ultra-thin flat seat cover" },
  { code: "V859", type: "one-piece", look: "A seamless one-piece toilet featuring a tall rectangular tank with a top dual-flush button, flowing into a fully skirted, smoothly tapered base with a slim-profile rounded seat" },
  { code: "V882F", type: "smart", look: "Tankless smart toilet with a glossy black top display panel, side control buttons, seamless skirted base with curved side paneling, and an accompanying wall remote" },
  { code: "V885", type: "smart", look: "Tankless, integrated bidet toilet featuring a smooth skirted base, side-mounted metallic dial knob, a top display panel, and an accompanying wall-mount remote control" },
  { code: "V899", type: "one-piece", look: "Seamless one-piece toilet featuring a low, angular tank integrated into a fully skirted base with a subtle tiered foot at the front and a slim oval seat" },
  { code: "V899D", type: "smart", look: "Low-profile seamless rectangular tank paired with a fully skirted smooth base and a slim elongated seat featuring a side rotary bidet control knob" },
  { code: "V901", type: "wall-hung", look: "Floating, tankless D-shaped bowl with a fully skirted smooth body, a flat slim seat cover, and a wall-mounted rectangular chrome dual-flush plate above" },
  { code: "V902", type: "wall-hung", look: "Tankless wall-hung bowl with a smooth curved underbelly, fully skirted flat sides, and an ultra-slim contoured seat cover" },
  { code: "V909", type: "wall-hung", look: "A wall-hung toilet with a smooth, tapered skirted bowl, a slim contoured lid slightly sloping upward at the back, and a square chrome dual-flush wall plate above" },
  { code: "V909D", type: "wall-hung", look: "Wall-mounted tankless bowl with fully skirted sides, integrated bidet seat featuring a side control knob, and a square chrome dual-flush wall plate above" },
  { code: "V91", type: "smart", look: "Tankless low-profile design with an integrated electronic bidet seat featuring a side indicator panel, set atop a fully skirted seamless porcelain base" },
  { code: "VI107", type: "two-piece", look: "Tall rounded tank with a top oval dual-flush button mounted on a bowl with a semi-contoured sculpted base and matching slim seat" },
  { code: "VI28", type: "two-piece", look: "A two-piece toilet featuring a tall, slender tank with a top-mounted circular dual-flush button, an oval seat, and an exposed contoured trapway base" },
  { code: "VI44", type: "two-piece", look: "Tall rectangular tank with a side-mount chrome trip lever, an exposed S-shaped trapway, and an oval bowl with a standard thin seat" },
  { code: "VI66", type: "two-piece", look: "Tall gently tapered water tank with a top dual-flush button and a round bowl supported by an exposed, sculpted trapway base" },
  { code: "VI66M", type: "two-piece", look: "Tall slightly tapered rectangular tank with a top dual-flush button, rounded bowl, and a prominently sculpted, exposed trapway base" },
  { code: "VI77", type: "two-piece", look: "Tall gently tapered tank with a front chrome trip lever and contoured lid, paired with an exposed, sculpted trapway base and rounded bowl" },
  { code: "VI88", type: "two-piece", look: "Tall two-piece toilet featuring an exposed sculpted trapway base with prominent contour ridges, an oval seat, and a rounded rectangular tank with a recessed top lid and dual flush buttons" },
  { code: "VT18M", type: "two-piece", look: "Two-piece toilet with an exposed sculpted trapway base, an oval bowl, and an upright rectangular tank featuring a raised-edge lid with a top-mounted dual-flush button" },
  { code: "VT34", type: "two-piece", look: "Two-piece toilet featuring an upright tapered tank with a top dual-flush button, a rounded bowl, and an exposed S-shaped trapway contour" },
];
export const TOILETS = LIST.map((t) => {
  const file = t.code.replace(/[^A-Za-z0-9]+/g, "-");
  return { ...t, name: `${TOILET_BRAND} ${t.code}`, image: `/products/viglacera/${file}.jpg`, thumb: `/products/viglacera/${file}-thumb.jpg` };
});
export const toiletOf = (product: unknown) => TOILETS.find((t) => t.name === product);
