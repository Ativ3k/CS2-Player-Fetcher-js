import * as child from "child_process";
import { cwd } from "process";
import chalk from "chalk";
import { table } from "table";
import fs from "fs";
import NodeCache from "node-cache";
import logUpdate from "log-update";

const c = chalk;

class CS2_Players_Data {
  constructor() {
    this.debug = false;
    this.cfg = JSON.parse(fs.readFileSync("./config.json", "utf8"));
    this.steamData = [];
    this.refreshInterval = this.cfg.refreshinterval;
    this.apiLeetify = {
      range: this.cfg.maxMatchesLeetify,
      profile: "https://api.leetify.com/api/profile/",
      games: "https://api.leetify.com/api/games/",
    };
    this.leetifyData = [];
    this.cache = new NodeCache({ stdTTL: 3600, checkperiod: 120 });
    this.dataError = false;
    this.tableErrorRefresh = false;
    this.tableData = [
      [
        c.yellow("Status"),
        c.yellow("Party"),
        c.yellow("Name"),
        c.yellow("Leetify"),
        c.yellow("Premier"),
        c.yellow("Aim"),
        c.yellow("Pos"),
        c.yellow("Util"),
        c.yellow("Wins"),
        c.yellow("Matches"),
        c.yellow("Faceit"),
        c.yellow("Kills min/avg/max"),
        c.yellow("KDR min/avg/max"),
        c.yellow("Hs% min/avg/max"),
        c.yellow("ReactionTime min/avg/max"),
        c.yellow("ADR min/avg/max"),
      ],
      ["x", "x", "x", "x", "x", "x", "x", "x", "x", "x", "x", "x", "x", "x", "x", "x"],
      ["x", "x", "x", "x", "x", "x", "x", "x", "x", "x", "x", "x", "x", "x", "x", "x"],
      ["x", "x", "x", "x", "x", "x", "x", "x", "x", "x", "x", "x", "x", "x", "x", "x"],
      ["x", "x", "x", "x", "x", "x", "x", "x", "x", "x", "x", "x", "x", "x", "x", "x"],
      ["x", "x", "x", "x", "x", "x", "x", "x", "x", "x", "x", "x", "x", "x", "x", "x"],
      ["x", "x", "x", "x", "x", "x", "x", "x", "x", "x", "x", "x", "x", "x", "x", "x"],
      ["x", "x", "x", "x", "x", "x", "x", "x", "x", "x", "x", "x", "x", "x", "x", "x"],
      ["x", "x", "x", "x", "x", "x", "x", "x", "x", "x", "x", "x", "x", "x", "x", "x"],
      ["x", "x", "x", "x", "x", "x", "x", "x", "x", "x", "x", "x", "x", "x", "x", "x"],
      ["x", "x", "x", "x", "x", "x", "x", "x", "x", "x", "x", "x", "x", "x", "x", "x"],
    ];
  }

  table() {
    const config = {
      columns: [
        { alignment: "center" },
        { alignment: "center" },
        { alignment: "center" },
        { alignment: "center" },
        { alignment: "center" },
        { alignment: "center" },
        { alignment: "center" },
        { alignment: "center" },
        { alignment: "center" },
        { alignment: "center" },
        { alignment: "center" },
        { alignment: "center" },
        { alignment: "center" },
        { alignment: "center" },
        { alignment: "center" },
        { alignment: "center" },
      ],
    };

    const teams = [
      {
        icon: "🟠",
        players: new Set(),
      },
      {
        icon: "🟣",
        players: new Set(),
      },
      {
        icon: "🟢",
        players: new Set(),
      },
      {
        icon: "🔵",
        players: new Set(),
      },
    ];

    const teamsHasPlayer = (playerName) => {
      return teams.some((team) => team.players.has(playerName));
    };

    const getTeamIcon = (playerName) => {
      return teams.find((team) => team.players.has(playerName))?.icon || "";
    };

    // sort by premier rating
    this.leetifyData.sort((a, b) => {
      const _a = a.games?.find((game) => game.rankType === 11)?.skillLevel || 0;
      const _b = b.games?.find((game) => game.rankType === 11)?.skillLevel || 0;
      return _b - _a;
    });

    this.leetifyData.forEach((player, i) => {
      // party check based on leetify teammates
      const friendsInMatch = player.teammates?.filter((friend) => this.steamData.map((d) => d.steam64Id).includes(friend.steam64Id));

      if (friendsInMatch) {
        for (const team of teams) {
          if (team.players.size === 0) {
            if (!teamsHasPlayer(player.meta.name)) {
              team.players.add(player.meta.name);
            }
            friendsInMatch.forEach((friend) => {
              if (!teamsHasPlayer(friend.steamNickname)) {
                team.players.add(friend.steamNickname);
              }
            });
          }
        }

        // clear teams with only one player
        teams.forEach((team) => {
          if (team.players.size === 1) {
            team.players.clear();
          }
        });
      }

      let wins = null;
      let tie = null;
      let premier = 0;
      let winRatio = null;
      const kills = [];
      if (player.games) {
        player.games.forEach((game) => {
          if (game.kills >= 0) {
            kills.push(game.kills);
          }
          if (game.matchResult === "win") {
            wins++;
          } else if (game.matchResult === "tie") {
            tie++;
          }
        });

        winRatio = ((wins / (player.games.length - tie)) * 100).toFixed(0) || null;
        winRatio > 50 ? (winRatio = c.green(`${winRatio}%`)) : (winRatio = c.red(`${winRatio}%`));

        premier = Number(player.games.find((game) => game.rankType === 11)?.skillLevel) || 0;
        if (premier !== 0) {
          if (premier > 29999) {
            premier = c.hex(`#f1ae35`)(`${premier}`);
          } else if (premier > 24999) {
            premier = c.hex(`#eb4c4a`)(`${premier}`);
          } else if (premier > 19999) {
            premier = c.hex(`#b12fc1`)(`${premier}`);
          } else if (premier > 14999) {
            premier = c.hex(`#8845ff`)(`${premier}`);
          } else if (premier > 9999) {
            premier = c.hex(`#4b69fe`)(`${premier}`);
          } else if (premier > 4999) {
            premier = c.hex(`#5e98d9`)(`${premier}`);
          } else {
            premier = c.hex(`#b0c4d8`)(`${premier}`);
          }
        }
      }

      let aim = undefined;
      let pos = undefined;
      let util = undefined;
      let leetify = undefined;

      if (player.recentGameRatings) {
        aim = player.recentGameRatings.aim;
        if (aim > 60) {
          aim = c.green(`${aim.toFixed(2)}`);
        } else {
          aim = c.white(`${aim.toFixed(2)}`);
        }

        pos = player.recentGameRatings.positioning;
        if (pos > 60) {
          pos = c.green(`${pos.toFixed(2)}`);
        } else {
          pos = c.white(`${pos.toFixed(2)}`);
        }

        util = player.recentGameRatings.utility;
        if (util > 60) {
          util = c.green(`${util.toFixed(2)}`);
        } else {
          util = c.white(`${util.toFixed(2)}`);
        }

        leetify = player.recentGameRatings.leetify * 100 || null;
        leetify > 2 ? (leetify = c.green(`${leetify.toFixed(2)}`)) : (leetify = c.red(`${leetify.toFixed(2)}`));
      }

      const reactionTime = [];
      const adr = [];
      const kdr = [];
      const hsp = [];

      player.games_full?.forEach((game) => {
        if (!game) return;
        const playerStats = game.playerStats.find((p) => p.steam64Id === player.meta.steam64Id);
        if (playerStats) {
          if (playerStats.reactionTime > 0) {
            reactionTime.push(playerStats.reactionTime * 1000);
          }
          if (playerStats.dpr !== undefined) adr.push(playerStats.dpr);
          if (playerStats.kdRatio !== undefined) kdr.push(playerStats.kdRatio);
          if (playerStats.kdRatio !== undefined) hsp.push(playerStats.hsp * 100);
        }
      });

      const minKills = Math.min(...kills).toFixed(0) || null;
      const avgKills = (kills.reduce((a, b) => a + b, 0) / kills.length).toFixed(0) || null;
      const maxKills = Math.max(...kills).toFixed(0) || null;

      const minRT = Math.min(...reactionTime).toFixed(0) || null;
      const avgRT = (reactionTime.reduce((a, b) => a + b, 0) / reactionTime.length).toFixed(0) || null;
      const maxRT = Math.max(...reactionTime).toFixed(0) || null;

      const minADR = Math.min(...adr).toFixed(2) || null;
      const avgADR = (adr.reduce((a, b) => a + b, 0) / adr.length).toFixed(2) || null;
      const maxADR = Math.max(...adr).toFixed(2) || null;

      const minKDR = Math.min(...kdr).toFixed(2) || null;
      const avgKDR = (kdr.reduce((a, b) => a + b, 0) / kdr.length).toFixed(2) || null;
      const maxKDR = Math.max(...kdr).toFixed(2) || null;

      const minHSP = Math.min(...hsp).toFixed(0) || null;
      const avgHSP = (hsp.reduce((a, b) => a + b, 0) / hsp.length).toFixed(0) || null;
      const maxHSP = Math.max(...hsp).toFixed(0) || null;

      const name = player.meta.name?.length === 0 ? player.meta.steam64Id : player.meta.name;

      const killsStr = `${minKills.padStart(2, " ")}` + ` ${c.yellow("/")} ${avgKills.padStart(2, " ")} ${c.yellow("/")} ${maxKills.padStart(2, " ")}`;
      const kdrStr = `${minKDR.padStart(4, " ")} ${c.yellow("/")} ${avgKDR.padStart(4, " ")} ${c.yellow("/")} ${maxKDR.padStart(4, " ")}`;
      const hspStr = `${minHSP.padStart(3, " ")} ${c.yellow("/")} ${avgHSP.padStart(3, " ")} ${c.yellow("/")} ${maxHSP.padStart(3, " ")}`;
      const rtStr = `${minRT.padStart(4, " ")} ${c.yellow("/")} ${avgRT.padStart(4, " ")} ${c.yellow("/")} ${maxRT.padStart(4, " ")} ms`;
      const adrStr = `${minADR.padStart(5, " ")} ${c.yellow("/")} ${avgADR.padStart(5, " ")} ${c.yellow("/")} ${maxADR.padStart(5, " ")}`;

      const error = this.cache.get(`err:${player.meta.steam64Id}`)?.error || false;
      if (error) {
        if (!this.tableErrorRefresh) {
          this.tableErrorRefresh = true;
          setTimeout(() => {
            this.table();
            this.tableErrorRefresh = false;
          }, 30000);
        }
      }

      this.tableData[i + 1] = [
        error ? "❌" : "✅",
        getTeamIcon(name),
        name,
        leetify,
        premier,
        aim,
        pos,
        util,
        winRatio,
        player.games?.length || null,
        player.meta.faceitNickname || "❌",
        killsStr,
        kdrStr,
        hspStr,
        rtStr,
        adrStr,
      ];

      if (this.debug) {
        console.clear();
        console.log(table(this.tableData, config));
        console.log(this.dataError);
      } else {
        logUpdate(table(this.tableData, config));
      }
    });

    if (this.debug) {
      console.clear();
      console.log(table(this.tableData, config));
      console.log(this.dataError);
    } else {
      logUpdate(table(this.tableData, config));
    }
    if (this.dataError) {
      this.dataError = false;
      setTimeout(() => {
        this.refreshData();
      }, 2000);
    }
  }

  refreshSteamIds() {
    const link = cwd() + "\\playerfetch\\PlayerFetch.exe";
    child.exec(link, (error, stdout, stderr) => {
      if (error) {
        if (this.debug) console.error(`error: ${error.message}`);
        return;
      }
      if (stderr) {
        if (this.debug) console.error(`stderr: ${stderr}`);
        return;
      }
      if (stdout) {
        const result = stdout
          .replaceAll("\r", "")
          .split("\n")
          .filter((x) => x.length > 0)
          .map((x) => JSON.parse(x))
          .sort((a, b) => a.steamId - b.steamId);

        /**
         *  3 players on wingman, 9 players on premier
         *  TODO: Test it and find better way to handle?
         */
        const isFullData = result.length > 2;
        // if (JSON.stringify(this.steamData) !== JSON.stringify(result) && isFullData) {
        const { mySteam64Id } = this.cfg;
        if (!isNaN(Number(mySteam64Id))) {
          result.push({ steam64Id: mySteam64Id, timestamp: (Date.now() / 1000).toFixed(0) });
        }
        this.steamData = result;
        this.refreshData();
        // }
      }
    });
  }

  async refreshData() {
    this.leetifyData = [];

    await Promise.all(
      this.steamData.map(async (player, i) => {
        const leetifyData = await this.getLeetifyProfile(player["steam64Id"]);
        if (leetifyData) {
          try {
            if (leetifyData.games.length > this.apiLeetify.maxMatchesLeetify) {
              leetifyData.games = leetifyData.games.slice(0, this.apiLeetify.maxMatchesLeetify);
            }
            const matches = await Promise.all(
              leetifyData.games.map(async (game) => {
                const match = await this.getMatchStats(game["gameId"], player["steam64Id"]);
                if (match && match.playerStats.length > 0) {
                  return match;
                }
              })
            );
            if (this.leetifyData.filter((p) => p.meta.steam64Id === player["steam64Id"]).length === 0) {
              leetifyData.games_full = matches;
              this.leetifyData.push(leetifyData);
            }
          } catch (error) {
            this.leetifyData.push({
              meta: {
                steam64Id: player["steam64Id"],
              },
            });
            this.cache.set(`err:${player["steam64Id"]}`, { error: true }, 30);
            if (this.debug) console.error(`Error refreshData | ${error} ${error.cause}`);
          }
        } else {
          this.leetifyData.push({
            meta: {
              steam64Id: player["steam64Id"],
            },
          });
        }
      })
    );
    this.table();
  }

  async getLeetifyProfile(steamId) {
    try {
      const isCached = this.cache.get(steamId);
      if (isCached) {
        return isCached;
      } else {
        const data = await fetch(this.apiLeetify.profile + steamId).then((res) => res.json());
        this.cache.set(steamId, data);
        return data;
      }
    } catch (error) {
      if (this.debug) console.error(`Error fetch profile: ${steamId} | ${error} ${error.cause}`);
      this.dataError = true;
      this.cache.set(`err:${steamId}`, { error: true }, 30);
      return false;
    }
  }

  async getMatchStats(matchId, steam64Id) {
    try {
      const isCached = this.cache.get(matchId);
      if (isCached) {
        return isCached;
      } else {
        const data = await fetch(this.apiLeetify.games + matchId).then((res) => res.json());
        this.cache.set(matchId, data);
        return data;
      }
    } catch (error) {
      if (this.debug) console.error(`Error fetch match: ${matchId} | ${error} ${error.cause}`);
      this.dataError = true;
      this.cache.set(`err:${steam64Id}`, { error: true }, 30);
      return false;
    }
  }

  startLoop() {
    this.refreshSteamIds();
    this.table();
    setInterval(() => {
      this.refreshSteamIds();
    }, this.refreshInterval);
  }
}

const playerData = new CS2_Players_Data();
playerData.startLoop();
