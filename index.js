import * as child from "child_process";
import { cwd } from "process";
import chalk from "chalk";
import { table } from "table";
import fs from "fs";

const c = chalk;
const cfg = JSON.parse(fs.readFileSync("./config.json", "utf8"));

class CS2_Players_Data {
  constructor() {
    this.steamData = [];
    this.refreshInterval = cfg.refreshinterval;
    this.apiLeetify = {
      range: cfg.maxMatchesLeetify,
      profile: "https://api.leetify.com/api/profile/",
      games: "https://api.leetify.com/api/games/",
    };
    this.leetifyData = [];
  }

  table() {
    const data = [
      [
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
        c.yellow("DPR min/avg/max"),
      ],
    ];
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
      ],
    };
    this.leetifyData.forEach((player) => {
      let wins = 0;
      let tie = 0;
      player.games.forEach((game) => {
        if (game.matchResult === "win") {
          wins++;
        } else if (game.matchResult === "tie") {
          tie++;
        }
      });

      let leetify = player.recentGameRatings.leetify * 100;
      leetify > 2 ? (leetify = c.green(`${leetify.toFixed(2)}`)) : (leetify = c.red(`${leetify.toFixed(2)}`));

      let premier = Number(player.games.find((game) => game.rankType === 11)?.skillLevel) || 0;
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
        } else if (premier < 5000) {
          premier = c.hex(`#b0c4d8`)(`${premier}`);
        }
      }

      let aim = player.recentGameRatings.aim;
      aim > 60 ? (aim = c.green(`${aim.toFixed(2)}`)) : (aim = aim.toFixed(2));

      let pos = player.recentGameRatings.positioning;
      pos > 60 ? (pos = c.green(`${pos.toFixed(2)}`)) : (pos = pos.toFixed(2));

      let util = player.recentGameRatings.utility;
      util > 60 ? (util = c.green(`${util.toFixed(2)}`)) : (util = util.toFixed(2));

      let winRatio = (wins / (player.games.length - tie)) * 100;
      winRatio > 50 ? (winRatio = c.green(`${winRatio.toFixed(0)}%`)) : (winRatio = c.red(`${winRatio.toFixed(0)}%`));

      let kills = [];
      let reactionTime = [];
      let adr = [];
      let kdr = [];
      let hsp = [];
      player.games_full.forEach((game) => {
        const playerStats = game.playerStats.find((player) => player.steamId === player.steamId);
        if (playerStats) {
          kills.push(playerStats.totalKills);
          reactionTime.push(playerStats.reactionTime);
          adr.push(playerStats.dpr);
          kdr.push(playerStats.kdRatio);
          hsp.push(playerStats.hsp * 100);
        }
      });
      const minKills = Math.min(...kills);
      const avgKills = kills.reduce((a, b) => a + b, 0) / kills.length;
      const maxKills = Math.max(...kills);

      const minRT = Math.min(...reactionTime);
      const avgRT = reactionTime.reduce((a, b) => a + b, 0) / reactionTime.length;
      const maxRT = Math.max(...reactionTime);

      const minADR = Math.min(...adr);
      const avgADR = adr.reduce((a, b) => a + b, 0) / adr.length;
      const maxADR = Math.max(...adr);

      const minKDR = Math.min(...kdr);
      const avgKDR = kdr.reduce((a, b) => a + b, 0) / kdr.length;
      const maxKDR = Math.max(...kdr);

      const minHSP = Math.min(...hsp);
      const avgHSP = hsp.reduce((a, b) => a + b, 0) / hsp.length;
      const maxHSP = Math.max(...hsp);

      data.push([
        player.meta.name,
        leetify,
        premier,
        aim,
        pos,
        util,
        winRatio,
        player.games.length,
        player.meta.faceitNickname || "❌",
        `${minKills.toFixed(0)} / ${avgKills.toFixed(1)} / ${maxKills.toFixed(0)}`,
        `${minKDR.toFixed(2)} / ${avgKDR.toFixed(2)} / ${maxKDR.toFixed(2)}`,
        `${minHSP.toFixed(0)} / ${avgHSP.toFixed(0)} / ${maxHSP.toFixed(0)}`,
        `${(minRT * 1000).toFixed(0)} / ${(avgRT * 1000).toFixed(0)} / ${(maxRT * 1000).toFixed(0)} ms`,
        `${minADR.toFixed(0)} / ${avgADR.toFixed(0)} / ${maxADR.toFixed(0)}`,
      ]);
    });
    console.log(table(data, config));
  }

  refreshSteamIds() {
    const link = cwd() + "\\playerfetch\\PlayerFetch.exe";
    child.exec(link, (error, stdout, stderr) => {
      if (error) {
        console.log(`error: ${error.message}`);
        return;
      }
      if (stderr) {
        console.log(`stderr: ${stderr}`);
        return;
      }
      if (stdout) {
        const result = stdout
          .replaceAll("\r", "")
          .split("\n")
          .filter((x) => x.length > 0)
          .map((x) => JSON.parse(x))
          .sort((a, b) => a.steamId - b.steamId);
        if (JSON.stringify(this.steamData) !== JSON.stringify(result)) {
          console.log("Refreshing Steam Ids...");
          this.steamData = result;
          this.refreshData();
        } else {
        }
        return;
      }
    });
  }

  async refreshData() {
    this.leetifyData = [];

    await Promise.all(
      this.steamData.map(async (player) => {
        const leetifyData = await this.getLeetifyProfile(player["steam64Id"]);
        if (leetifyData) {
          try {
            const matches = await Promise.all(
              leetifyData.games.map(async (game) => {
                const match = await this.getMatchStats(game["gameId"]);
                if (match) {
                  return match;
                }
              })
            );
            leetifyData.games_full = matches;
            this.leetifyData.push(leetifyData);
          } catch (error) {
            this.leetifyData.push({
              player: player.steam64Id,
              profile: null,
              matches: null,
              analytics: {
                reactionTime: {
                  min: null,
                  avg: null,
                  max: null,
                },
                totalKills: {
                  min: null,
                  avg: null,
                  max: null,
                },
                dpr: {
                  min: null,
                  avg: null,
                  max: null,
                },
                hsp: {
                  min: null,
                  avg: null,
                  max: null,
                },
              },
            });
            console.log(error);
          }
        }
      })
    );

    this.table();
  }

  async getLeetifyProfile(steamId) {
    try {
      const data = await fetch(this.apiLeetify.profile + steamId).then((res) => res.json());
      return data;
    } catch (error) {
      console.log(`No Leetify data for ${steamId}`);
      return false;
    }
  }

  async getMatchStats(matchId) {
    try {
      const data = await fetch(this.apiLeetify.games + matchId).then((res) => res.json());
      return data;
    } catch (error) {
      console.log(`No Leetify data for match id: ${matchId}`);
      return null;
    }
  }

  startLoop() {
    this.refreshSteamIds();
    setInterval(() => {
      this.refreshSteamIds();
    }, this.refreshInterval);
  }
}

const playerData = new CS2_Players_Data();
playerData.startLoop();
