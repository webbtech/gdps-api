# Gales Dips Services Map

| Name | Cloud Formation Stack name | In-Use | Require Upgrade | Description|
| :------ | :--- | :--- | :--- | :--------- |
| gales-fuelsale-export | gales-fuelsale-export | Y | Y | Lambda Service to extract fuel and propane sales from gales-sales app |
| gsales-fs-export | gsales-fs-export | Y | N | Lambda Service to extract fuel and propane sales from gales-sales app - updated version from gales-fuelsale-export |
| gales-tank-utils | - | N | N | Several utilities designed to manage tanks, station tanks and dispensers - NOT a lambda |
| gdps-fs-dwnld | gdps-fs-dwnld | Y | Y | Lambda to export XLSX report file |
| gdps-fs-sum-dwnld | gdps-fs-sum-dwnld-stable | Y | Y | Lambda to export XLSX report file |
| gdps-propane-dwnld | gdps-propane-dwnld | Y | Y | Lambda to export XLSX report file |
| gdps-tank-files | gdps-tank-files | N | N | Lambda utility to determine validity of a tank file and levels. Believe this was used to deal with tank levels |
