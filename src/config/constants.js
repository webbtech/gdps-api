
const prefix = 'GDS_'

export const dynamoTables = {
  CONFIG: `${prefix}Config`,
  DIP: `${prefix}Dip`,
  DIP_OVERSHORT: `${prefix}DipOverShort`,
  FUEL_DELIVER: `${prefix}FuelDeliver`,
  FUEL_PRICE: `${prefix}FuelPrice`,
  FUEL_SALE: `${prefix}FuelSale`,
  FUEL_SALE_WEEKLY: `${prefix}FuelSaleWeekly`,
  IMPORT_LOG: `${prefix}ImportLog`,
  PROPANE_DELIVER: `${prefix}PropaneDeliver`,
  PROPANE_SALE: `${prefix}PropaneSale`,
  STATION: `${prefix}Station`,
  STATION_NODE: `${prefix}StationNode`,
  STATION_TANK: `${prefix}StationTank`,
  TANK: `${prefix}Tank`,
}

export const propaneTankIDs = [475, 476]

export const FUEL_TYPE_LIST = ['NL', 'SNL', 'DSL', 'CDSL']

export const COGNITO_USER_POOL_ID = 'https://cognito-idp.ca-central-1.amazonaws.com/ca-central-1_lolwfYIAr'

// lambda used when downloading fuel sales data from Sales app in "Import Sales Data"
// export const FUELSALE_EXPORT_LAMBDA = 'https://fs-export.gsales.pfapi.io/export'
export const FUELSALE_EXPORT_LAMBDA = 'https://fs-import-prod.gdps.pfapi.io/export' // NOTE: if stage is enabled, we'll need to create a function here

// ========== Various Report Lambdas ============================================================
// Station Report
export const FUELSALE_REPORT_LAMBDA = 'https://station-dnld-prod.gdps.pfapi.io/fuelsale'

// Fuel Sale Summary Report
export const FUELSALE_SUM_REPORT_LAMBDA = 'https://fuelsale-summary-dnld-prod.gdps.pfapi.io/report'

// Propane Report
export const PROPANE_REPORT_LAMBDA = 'https://propane-dnld-prod.gdps.pfapi.io/propane'
