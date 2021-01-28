import { getFiles, parseCsv, sprintf, VERSION, writeCSV } from "./deps.ts";

interface Row {
  buySell: string;
  item: string;
  cost: number;
  stock: number;
  max: number;
  sector1: string;
  sector2: string;
  station: string;
  volume: number;
}

const parseInt = (e: string) => Number.parseInt(e, 10);
const parseFloat = (e: string) => Number.parseFloat(e);

const writeResults = async (rows: Row[]) => {
  const mapped = rows.map(({
    buySell,
    item,
    cost,
    stock,
    max,
    sector1,
    sector2,
    station,
    volume,
  }) => [buySell, item, cost, stock, max, sector1, sector2, station, volume]);

  const headers = [
    "Buy / Sell",
    "Item",
    "Cost",
    "Stock",
    "Max holding",
    "Sector 1",
    "Sector 2",
    "Station",
    "Volume",
  ];
  const out: any[] = [headers, ...mapped];

  const file = await Deno.open(`./merged.csv`, {
    write: true,
    create: true,
    truncate: true,
  });
  await writeCSV(file, out);
};

const writeTradeRoutes = async (rows: TradeRoute[]) => {
  const mapped = rows.map(({
    item,
    buyFrom,
    buyPrice,
    sellTo,
    sellPrice,
    units,
    profit,
    volume,
  }) => [item, buyFrom, buyPrice, sellTo, sellPrice, units, profit, volume]);

  const headers = [
    "Item",
    "Buy from",
    "Buy price",
    "Sell to",
    "Sale price",
    "Units",
    "Profit",
    "Volume",
  ];
  const out: any[] = [headers, ...mapped];

  const file = await Deno.open(`./traderoutes.csv`, {
    write: true,
    create: true,
    truncate: true,
  });
  await writeCSV(file, out);
};

const parse = async () => {
  const files = await getFiles({
    root: "./",
    ignore: ["output.csv", "merged.csv", "traderoutes.csv"],
  });
  const csvFiles = files.filter((f) => f.ext === "csv");

  const columns = [
    { name: "buySell" },
    { name: "item" },
    { name: "cost", parse: parseInt },
    { name: "stock", parse: parseInt },
    { name: "max", parse: parseInt },
    { name: "sector1" },
    { name: "sector2" },
    { name: "station" },
    { name: "volume", parse: parseFloat },
  ];

  const rows: Row[] = [];
  for (const file of csvFiles) {
    const text = await Deno.readTextFile(`${file.path}`);
    const content: Row[] = (await parseCsv(text, {
      columns,
      skipFirstRow: false,
      separator: ";",
    })) as Row[];
    rows.push(...content);
  }

  rows.sort((a: any, b: any) => {
    const tA = a.item.toUpperCase();
    const tB = b.item.toUpperCase();
    return (tA < tB) ? -1 : tA > tB ? 1 : 0;
  });

  return {
    rows,
    numFiles: csvFiles.length,
    numRows: rows.length,
  };
};

const main = async () => {
  const { numFiles, rows, numRows } = await parse();

  console.log(`Avorion CSV Parser v${VERSION}`);
  console.log();
  console.log(`Files processed: ${numFiles}`);
  console.log(`Rows processed: ${numRows}`);

  // Create separate lists of stations we can buy from and sell to
  const sellTo = rows.filter((r) => r.buySell.toLowerCase() === "sell");
  const buyFrom = rows.filter((r) => r.buySell.toLowerCase() === "buy");

  // Figure out which items we can actually connect as a trade route
  const prods: any[] = [];
  rows.forEach((r) => {
    const buy = r.buySell.toLowerCase() === "buy";
    const sell = r.buySell.toLowerCase() === "sell";

    const p = prods.find((e) => e.item === r.item);
    if (p) {
      p.buy = p.buy || buy;
      p.sell = p.sell || sell;
      return;
    }
    prods.push({ item: r.item, buy, sell });
  });
  const routable = prods.filter((p) => p.buy && p.sell);

  console.log(`Trade routes found: ${routable.length}`);
  console.log();

  const header = sprintf(
    "%20-s %20-s %20-s %20-s %20-s %20-s %20-s %20-s",
    "Item name",
    "Buy from",
    "Buy price",
    "Sell to",
    "Sale price",
    "Units",
    "Profit",
    "Volume",
  );
  console.log(header);
  console.log("=".repeat(160));

  const routes: TradeRoute[] = [];
  routable.forEach(({ item }) => {
    const bestPurchase = buyFrom.filter((s) => s.item === item).reduce((p, c,) => c.cost < p.cost ? c : p);
    const bestSale = sellTo.filter((s) => s.item === item).reduce((p, c,) => c.cost > p.cost ? c : p);
    const profit = (bestSale.cost - bestPurchase.cost) * bestPurchase.stock;
    const volume = bestSale.volume * bestPurchase.stock;

    const r: TradeRoute = {
      item,
      buyFrom: `${bestPurchase.sector1}, ${bestPurchase.sector2}`,
      buyPrice: bestPurchase.cost,
      sellTo: `${bestSale.sector1}, ${bestSale.sector2}`,
      sellPrice: bestSale.cost,
      units: bestPurchase.stock,
      profit,
      volume,
    };

    // Only save profitable routes
    if (r.profit > 0) {
      routes.push(r);
    }
  });

  routes.sort((a, b) => a.profit < b.profit ? 1 : a.profit > b.profit ? -1 : 0);

  const lines = routes.map((r) =>
    sprintf(
      "%20-s %20-s %20-d %20-s %20-d %20-d %20-d %20-d",
      r.item,
      r.buyFrom,
      r.buyPrice,
      r.sellTo,
      r.sellPrice,
      r.units,
      r.profit,
      r.volume.toFixed(2),
    )
  );
  lines.forEach((l) => console.log(l));

  const totalProfit = routes.map((r) => r.profit).reduce((p, c) => p + c);
  console.log(`\nPotential profit total: ${totalProfit}`);

  await writeResults(rows);
  await writeTradeRoutes(routes);
};

interface TradeRoute {
  item: string;
  buyFrom: string;
  buyPrice: number;
  sellTo: string;
  sellPrice: number;
  units: number;
  profit: number;
  volume: number;
}

main();
