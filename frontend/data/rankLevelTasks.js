const RANK_LEVEL_PROMOTION_REQUIREMENTS = {
    "bronze-i": {
        title: "Bronze I ➜ Bronze II",
        tasks: [
            "Reach an overall StatsHexagon score of at least 18",
            "Raise your Shoulders score to 16 or better",
            "Log 12,000 or more total training volume this tier",
        ],
    },
    "bronze-ii": {
        title: "Bronze II ➜ Bronze III",
        tasks: [
            "Reach an overall StatsHexagon score of at least 22",
            "Push your Shoulders score to 20 or better",
            "Accumulate at least 25,000 volume and log two PRs",
        ],
    },
    "bronze-iii": {
        title: "Bronze III ➜ Bronze IV",
        tasks: [
            "Reach an overall StatsHexagon score of at least 28",
            "Raise both Chest and Arms scores to 22 or better",
            "Move at least 40,000 total volume while recording three PRs",
        ],
    },
    "bronze-iv": {
        title: "Bronze IV ➜ Bronze V",
        tasks: [
            "Reach an overall StatsHexagon score of at least 32",
            "Push Shoulders to 26+ and Legs to 24+",
            "Accumulate 55,000 or more volume with four PRs",
        ],
    },
    "bronze-v": {
        title: "Bronze V ➜ Silver I",
        tasks: [
            "Reach an overall StatsHexagon score of at least 36",
            "Raise Shoulders to 30+ and Legs to 28+",
            "Log 70,000+ volume while recording five PRs",
        ],
    },
    "silver-i": {
        title: "Silver I ➜ Silver II",
        tasks: [
            "Log at least eight workouts during the tier",
            "Keep every StatsHexagon axis at 35 or higher with overall 45+",
            "Accumulate 140,000 total volume and record six PRs",
        ],
    },
    "silver-ii": {
        title: "Silver II ➜ Silver III",
        tasks: [
            "Log at least nine workouts",
            "Reach an overall StatsHexagon score of 50+ with Shoulders 40+",
            "Move at least 165,000 total volume and collect seven PRs",
        ],
    },
    "silver-iii": {
        title: "Silver III ➜ Silver IV",
        tasks: [
            "Log ten workouts or more",
            "Keep Shoulders, Chest, Arms, and Legs at 42+ with overall 54+",
            "Move 190,000+ volume while recording eight PRs",
        ],
    },
    "silver-iv": {
        title: "Silver IV ➜ Silver V",
        tasks: [
            "Log ten workouts or more",
            "Reach overall 58+ and push Shoulders to 46+",
            "Move 215,000+ volume and record nine PRs (three single-rep)",
        ],
    },
    "silver-v": {
        title: "Silver V ➜ Gold I",
        tasks: [
            "Log eleven workouts or more",
            "Reach overall 62+ and raise Shoulders to 50+",
            "Move 245,000+ volume while recording ten PRs",
        ],
    },
    "gold-i": {
        title: "Gold I ➜ Gold II",
        tasks: [
            "Log at least twelve workouts",
            "Reach overall 65+ with Shoulders 54+",
            "Move 270,000+ volume and record eleven PRs (two single-rep)",
        ],
    },
    "gold-ii": {
        title: "Gold II ➜ Gold III",
        tasks: [
            "Log twelve workouts plus one assessment session",
            "Reach overall 68+ and push Shoulders to 57+",
            "Move 295,000+ volume while recording twelve PRs",
        ],
    },
    "gold-iii": {
        title: "Gold III ➜ Gold IV",
        tasks: [
            "Log thirteen workouts or more",
            "Keep every StatsHexagon axis at 56+ with overall 70+",
            "Move 320,000+ volume and record twelve PRs (two multi-rep)",
        ],
    },
    "gold-iv": {
        title: "Gold IV ➜ Gold V",
        tasks: [
            "Log thirteen workouts or more",
            "Reach overall 72+ and push Shoulders to 62+",
            "Move 345,000+ volume while logging thirteen PRs",
        ],
    },
    "gold-v": {
        title: "Gold V ➜ Ruby I",
        tasks: [
            "Log fourteen workouts or more",
            "Reach overall 74+ and improve your weakest axis by three points",
            "Move 375,000+ volume while recording fourteen PRs",
        ],
    },
    "ruby-i": {
        title: "Ruby I ➜ Ruby II",
        tasks: [
            "Log fourteen workouts or more",
            "Reach overall 76+ with Shoulders 66+",
            "Accumulate 400,000+ volume while recording fifteen PRs",
        ],
    },
    "ruby-ii": {
        title: "Ruby II ➜ Ruby III",
        tasks: [
            "Log fifteen workouts or more",
            "Keep all axes at 64+ with overall 78+",
            "Move 425,000+ volume and record fifteen PRs (four multi-rep)",
        ],
    },
    "ruby-iii": {
        title: "Ruby III ➜ Ruby IV",
        tasks: [
            "Log fifteen workouts or more",
            "Reach overall 80+ with Shoulders 70+",
            "Move 450,000+ volume and record sixteen PRs",
        ],
    },
    "ruby-iv": {
        title: "Ruby IV ➜ Ruby V",
        tasks: [
            "Log sixteen workouts or more",
            "Reach overall 82+ with Shoulders 72+",
            "Move 475,000+ volume while recording sixteen PRs",
        ],
    },
    "ruby-v": {
        title: "Ruby V ➜ Platinum I",
        tasks: [
            "Log sixteen workouts or more",
            "Reach overall 84+ and keep every axis at 72+",
            "Move 500,000+ volume while recording seventeen PRs",
        ],
    },
    "platinum-i": {
        title: "Platinum I ➜ Platinum II",
        tasks: [
            "Log seventeen workouts or more",
            "Reach overall 85+ with Shoulders 76+",
            "Move 530,000+ volume while recording eighteen PRs",
        ],
    },
    "platinum-ii": {
        title: "Platinum II ➜ Platinum III",
        tasks: [
            "Log seventeen workouts or more",
            "Reach overall 86+ with Shoulders 78+",
            "Move 555,000+ volume while recording eighteen PRs (three total-strength)",
        ],
    },
    "platinum-iii": {
        title: "Platinum III ➜ Platinum IV",
        tasks: [
            "Log eighteen workouts or more",
            "Reach overall 87+ with Shoulders 80+",
            "Move 580,000+ volume while logging nineteen PRs",
        ],
    },
    "platinum-iv": {
        title: "Platinum IV ➜ Platinum V",
        tasks: [
            "Log eighteen workouts or more",
            "Reach overall 88+ with Shoulders 82+",
            "Move 605,000+ volume while recording nineteen PRs (four multi-rep)",
        ],
    },
    "platinum-v": {
        title: "Platinum V ➜ Diamond I",
        tasks: [
            "Log nineteen workouts or more",
            "Reach overall 89+ with Shoulders 84+",
            "Accumulate 630,000+ volume while recording twenty PRs",
        ],
    },
    "diamond-i": {
        title: "Diamond I ➜ Diamond II",
        tasks: [
            "Log twenty workouts or more",
            "Reach overall 90+ with Shoulders 86+",
            "Move 660,000+ volume while recording twenty-one PRs",
        ],
    },
    "diamond-ii": {
        title: "Diamond II ➜ Diamond III",
        tasks: [
            "Log twenty workouts or more",
            "Reach overall 91+ with Shoulders 87+",
            "Move 690,000+ volume while recording twenty-one PRs and 190 lifetime PRs",
        ],
    },
    "diamond-iii": {
        title: "Diamond III ➜ Diamond IV",
        tasks: [
            "Log twenty-one workouts or more",
            "Reach overall 92+ with Shoulders 88+",
            "Move 720,000+ volume while recording twenty-two PRs",
        ],
    },
    "diamond-iv": {
        title: "Diamond IV ➜ Diamond V",
        tasks: [
            "Log twenty-two workouts or more",
            "Reach at least 100 lifetime workouts with overall 94+",
            "Move 750,000+ volume while recording twenty-four PRs (two top-tier lifts)",
        ],
    },
};

export default Object.freeze(RANK_LEVEL_PROMOTION_REQUIREMENTS);
