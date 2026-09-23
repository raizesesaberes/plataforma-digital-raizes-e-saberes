export const TABLET_BREAKPOINT = 700;

export function isTabletWidth(width: number) {
  return width >= TABLET_BREAKPOINT;
}

export const brandingAssets = {
  splash: {
    phone: require("../assets/branding/rs_splash_phone.png"),
    tablet: require("../assets/branding/rs_splash_tablet.png")
  },
  login: {
    phone: require("../assets/branding/rs_login_phone.png"),
    tablet: require("../assets/branding/rs_login_tablet.png")
  },
  crescer: {
    phone: require("../assets/branding/rs_crescer_bg_phone.png"),
    tablet: require("../assets/branding/rs_crescer_bg_tablet.png")
  },
  student: {
    phone: require("../assets/branding/rs_student_bg_phone.png"),
    tablet: require("../assets/branding/rs_student_bg_tablet.png")
  },
  teacher: {
    phone: require("../assets/branding/rs_crescer_bg_phone.png"),
    tablet: require("../assets/branding/rs_crescer_bg_tablet.png")
  }
} as const;

export type BrandedEnvironment = "crescer" | "student" | "teacher";

export function brandedAssetFor(environment: BrandedEnvironment, width: number) {
  const size = isTabletWidth(width) ? "tablet" : "phone";
  return brandingAssets[environment][size];
}

export function loginAssetFor(width: number) {
  return brandingAssets.login[isTabletWidth(width) ? "tablet" : "phone"];
}

export function splashAssetFor(width: number) {
  return brandingAssets.splash[isTabletWidth(width) ? "tablet" : "phone"];
}
