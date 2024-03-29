/** The status messages for hiatus states */
export enum HiatusStatus {
    NoHiatus = `☑️ User has no active hiatus`,
    ActiveHiatus = `⏳ User has active hiatus`,
    ActiveIndefiniteHiatus = `⏳ User has active hiatus without end date`,
    AskedForExtension = `⏳❗ User has recently set a hiatus`,
}
