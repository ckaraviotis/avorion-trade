# Avorion Trade Route Tool

This project loads all .CSV files in it's working directory and produces the following output

1. A single merged CSV file with all the raw data
2. The most profitable trades, with source, destination, profit & volume saved to `traderoutes.csv`
3. The same output as above, printed to the screen, along with some stats of the files processed

Designed to work with files output by [avorionTradeExport](https://github.com/cbasix/avorionTradeExport)

Currently doesn't do any distance calculations. Profits are based purely on best prices.

## Example output

```
Avorion CSV Parser

Files processed: 2
Rows processed: 75
Trade routes found: 3

Item name            Buy from             Buy price            Sell to              Sale price           Units                Profit               Volume
================================================================================================================================================================
Oil                  149, -336            488                  107, -350            537                  6752                 330848               6752
Carbon               107, -350            420                  107, -350            490                  1716                 120120               1716
Oxygen               149, -336            70                   107, -350            94                   1390                 33360                1390

Potential profit total: 484328
```

## Running

The project is written in TypeScript using Deno as the runtime. To run the program, you'll need to give deno read and write access.
This can be limited to CSV files if needed.

Two scripts, `build.sh` and `run.sh` are provided to save keystrokes. They use the commands detailed below.

```sh
deno run --allow-read --allow-write  avorion-trade.ts
```

To build an executable, the command is

```sh
deno compile --unstable --output ./build/avorion-trade --lite --allow-read --allow-write avorion-trade.ts
```

**Note:** Cross compilation of windows binaries on linux isn't working in the current release version of Deno (1.7.0). Once it's
fixed, adding `--target x86_64-pc-windows-msvc` to `build.sh` should allow windows binaries to be produced. For now, I'm building
them using the windows version of Deno.
