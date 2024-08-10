import React from 'react';
import { Image, StyleSheet, View } from 'react-native';

const ExerciseImagePreview = ({ exercise }) => {
    let source;
    let imageStyle = styles.defaultImage; // Default style if no specific style is defined

    switch (exercise) {
        case '45-Degree Leg Press (Machine)':
            source = require('../../../../assets/exercises/45-degree-leg-press-machine/small.png');
            imageStyle = styles._45_degree_leg_press_machine;
            break;
        case 'T-Bar Row (Machine)':
            source = require('../../../../assets/exercises/T-bar-row-machine/small.png');
            imageStyle = styles.t_bar_row_machine;
            break;
        case 'Ab Wheel Rollout':
            source = require('../../../../assets/exercises/ab-wheel-rollout/small.png');
            imageStyle = styles.ab_wheel_rollout;
            break;
        case 'Arnold Press (Dumbbell)':
            source = require('../../../../assets/exercises/arnold-press-dumbbell/small.png');
            imageStyle = styles.arnold_press_dumbbell;
            break;
        case 'Around the World (Dumbbell)':
            source = require('../../../../assets/exercises/around-the-world-dumbbell/small.png');
            imageStyle = styles.around_the_world_dumbbell;
            break;
        case 'Assisted Pull-Up (Band)':
            source = require('../../../../assets/exercises/assisted-pull-up-band/small.png');
            imageStyle = styles.assisted_pull_up_band;
            break;
        case 'Back Extension':
            source = require('../../../../assets/exercises/back-extension/small.png');
            imageStyle = styles.back_extension;
            break;
        case 'Back Extension (Machine)':
            source = require('../../../../assets/exercises/back-extension-machine/small.png');
            imageStyle = styles.back_extension_machine;
            break;
        case 'Back Squat (Barbell)':
            source = require('../../../../assets/exercises/back-squat-barbell/small.png');
            imageStyle = styles.back_squat_barbell;
            break;
        case 'Ball Slam':
            source = require('../../../../assets/exercises/ball-slam/small.png');
            imageStyle = styles.ball_slam;
            break;
        case 'Bench Dip':
            source = require('../../../../assets/exercises/bench-dip/small.png');
            imageStyle = styles.bench_dip;
            break;
        case 'Bench Press (Barbell)':
            source = require('../../../../assets/exercises/bench-press-barbell/small.png');
            imageStyle = styles.bench_press_barbell;
            break;
        case 'Bench Press (Cable)':
            source = require('../../../../assets/exercises/bench-press-cable/small.png');
            imageStyle = styles.bench_press_cable;
            break;
        case 'Bench Press (Dumbbell)':
            source = require('../../../../assets/exercises/bench-press-dumbbell/small.png');
            imageStyle = styles.bench_press_dumbbell;
            break;
        case 'Bench Press (Smith Machine)':
            source = require('../../../../assets/exercises/bench-press-smith-machine/small.png');
            imageStyle = styles.bench_press_smith_machine;
            break;
        case 'Bench Split Squat':
            source = require('../../../../assets/exercises/bench-split-squat/small.png');
            imageStyle = styles.bench_split_squat;
            break;
        case 'Bench Squat (Barbell)':
            source = require('../../../../assets/exercises/bench-squat-barbell/small.png');
            imageStyle = styles.bench_squat_barbell;
            break;
        case 'Bent-Over Row (Band)':
            source = require('../../../../assets/exercises/bent-over-row-band/small.png');
            imageStyle = styles.bent_over_row_band;
            break;
        case 'Bent-Over Row (Barbell)':
            source = require('../../../../assets/exercises/bent-over-row-barbell/small.png');
            imageStyle = styles.bent_over_row_barbell;
            break;
        case 'Bent-Over Row (Dumbbell)':
            source = require('../../../../assets/exercises/bent-over-row-dumbbell/small.png');
            imageStyle = styles.bent_over_row_dumbbell;
            break;
        case 'Bicep Curl (Barbell)':
            source = require('../../../../assets/exercises/bicep-curl-barbell/small.png');
            imageStyle = styles.bicep_curl_barbell;
            break;
        case 'Bicep Curl (Dumbbell)':
            source = require('../../../../assets/exercises/bicep-curl-dumbbell/small.png');
            imageStyle = styles.bicep_curl_dumbbell;
            break;
        case 'Bicep Curl (Machine)':
            source = require('../../../../assets/exercises/bicep-curl-machine/small.png');
            imageStyle = styles.bicep_curl_machine;
            break;
        case 'Biceps Curl (Cable)':
            source = require('../../../../assets/exercises/biceps-curl-cable/small.png');
            imageStyle = styles.biceps_curl_cable;
            break;
        case 'Bicycle Crunch':
            source = require('../../../../assets/exercises/bicycle-crunch/small.png');
            imageStyle = styles.bicycle_crunch;
            break;
        case 'Box Jump':
            source = require('../../../../assets/exercises/box-jump/small.png');
            imageStyle = styles.box_jump;
            break;
        case 'Burpee':
            source = require('../../../../assets/exercises/burpee/small.png');
            imageStyle = styles.burpee;
            break;
        case 'Calf Raise (Dumbbell)':
            source = require('../../../../assets/exercises/calf-raise-dumbbell/small.png');
            imageStyle = styles.calf_raise_dumbbell;
            break;
        case 'Calf Raise on 45-Degree Leg Press (Machine)':
            source = require('../../../../assets/exercises/calf-raise-on-45-degree-leg-press-machine/small.png');
            imageStyle = styles.calf_raise_on_45_degree_leg_press_machine;
            break;
        case 'Calf Raise on Leg Press (Machine)':
            source = require('../../../../assets/exercises/calf-raise-on-leg-press-machine/small.png');
            imageStyle = styles.calf_raise_on_leg_press_machine;
            break;
        case 'Calf Raise (Smith Machine)':
            source = require('../../../../assets/exercises/calf-raise-smith-machine/small.png');
            imageStyle = styles.calf_raise_smith_machine;
            break;
        case 'Chest Dip':
            source = require('../../../../assets/exercises/chest-dip/small.png');
            imageStyle = styles.chest_dip;
            break;
        case 'Chest Dip (Assisted)':
            source = require('../../../../assets/exercises/chest-dip-assisted/small.png');
            imageStyle = styles.chest_dip_assisted;
            break;
        case 'Chest Fly (Cable)':
            source = require('../../../../assets/exercises/chest-fly-cable/small.png');
            imageStyle = styles.chest_fly_cable;
            break;
        case 'Chest Fly (Dumbbell)':
            source = require('../../../../assets/exercises/chest-fly-dumbbell/small.png');
            imageStyle = styles.chest_fly_dumbbell;
            break;
        case 'Chest Fly (Machine)':
            source = require('../../../../assets/exercises/chest-fly-machine/small.png');
            imageStyle = styles.chest_fly_machine;
            break;
        case 'Chest Press (Machine)':
            source = require('../../../../assets/exercises/chest-press-machine/small.png');
            imageStyle = styles.chest_press_machine;
            break;
        case 'Chin-Up':
            source = require('../../../../assets/exercises/chin-up/small.png');
            imageStyle = styles.chin_up;
            break;
        case 'Chin-Up (Assisted)':
            source = require('../../../../assets/exercises/chin-up-assisted/small.png');
            imageStyle = styles.chin_up_assisted;
            break;
        case 'Clean and Jerk (Barbell)':
            source = require('../../../../assets/exercises/clean-and-jerk-barbell/small.png');
            imageStyle = styles.clean_and_jerk_barbell;
            break;
        case 'Clean High Pull (Barbell)':
            source = require('../../../../assets/exercises/clean-high-pull-barbell/small.png');
            imageStyle = styles.clean_high_pull_barbell;
            break;
        case 'Close-Grip Bench Press (Barbell)':
            source = require('../../../../assets/exercises/close-grip-bench-press-barbell/small.png');
            imageStyle = styles.close_grip_bench_press_barbell;
            break;
        case 'Concentration Curl (Dumbbell)':
            source = require('../../../../assets/exercises/concentration-curl-dumbbell/small.png');
            imageStyle = styles.concentration_curl_dumbbell;
            break;
        case 'Cross-Body Crunch':
            source = require('../../../../assets/exercises/cross-body-crunch/small.png');
            imageStyle = styles.cross_body_crunch;
            break;
        case 'Crunch':
            source = require('../../../../assets/exercises/crunch/small.png');
            imageStyle = styles.crunch;
            break;
        case 'Cable Crunch':
            source = require('../../../../assets/exercises/crunch-cable/small.png');
            imageStyle = styles.crunch_cable;
            break;
        case 'Deadlift (Band)':
            source = require('../../../../assets/exercises/deadlift-band/small.png');
            imageStyle = styles.deadlift_band;
            break;
        case 'Deadlift (Barbell)':
            source = require('../../../../assets/exercises/deadlift-barbell/small.png');
            imageStyle = styles.deadlift_barbell;
            break;
        case 'Deadlift (Dumbbell)':
            source = require('../../../../assets/exercises/deadlift-dumbbell/small.png');
            imageStyle = styles.deadlift_dumbbell;
            break;
        case 'Deadlift from Deficit (Barbell)':
            source = require('../../../../assets/exercises/deadlift-from-deficit-barbell/small.png');
            imageStyle = styles.deadlift_from_deficit_barbell;
            break;
        case 'Deadlift (Smith Machine)':
            source = require('../../../../assets/exercises/deadlift-smith-machine/small.png');
            imageStyle = styles.deadlift_smith_machine;
            break;
        case 'Deadlift (Trap Bar)':
            source = require('../../../../assets/exercises/deadlift-trap-bar/small.png');
            imageStyle = styles.deadlift_trap_bar;
            break;
        case 'Decline Bench Press (Barbell)':
            source = require('../../../../assets/exercises/decline-bench-press-barbell/small.png');
            imageStyle = styles.decline_bench_press_barbell;
            break;
        case 'Decline Bench Press (Dumbbell)':
            source = require('../../../../assets/exercises/decline-bench-press-dumbbell/small.png');
            imageStyle = styles.decline_bench_press_dumbbell;
            break;
        case 'Decline Bench (Smith Machine)':
            source = require('../../../../assets/exercises/decline-bench-smith-machine/small.png');
            imageStyle = styles.decline_bench_smith_machine;
            break;
        case 'Decline Crunch':
            source = require('../../../../assets/exercises/decline-crunch/small.png');
            imageStyle = styles.decline_crunch;
            break;
        case 'Decline Sit-Up':
            source = require('../../../../assets/exercises/decline-sit-up/small.png');
            imageStyle = styles.decline_sit_up;
            break;
        case 'Floor Press (Barbell)':
            source = require('../../../../assets/exercises/floor-press-barbell/small.png');
            imageStyle = styles.floor_press_barbell;
            break;
        case 'Front Raise':
            source = require('../../../../assets/exercises/front-raise/small.png');
            imageStyle = styles.front_raise;
            break;
        case 'Front Raise (Band)':
            source = require('../../../../assets/exercises/front-raise-band/small.png');
            imageStyle = styles.front_raise_band;
            break;
        case 'Front Raise (Barbell)':
            source = require('../../../../assets/exercises/front-raise-barbell/small.png');
            imageStyle = styles.front_raise_barbell;
            break;
        case 'Front Raise (Cable)':
            source = require('../../../../assets/exercises/front-raise-cable/small.png');
            imageStyle = styles.front_raise_cable;
            break;
        case 'Front Raise (Dumbbell)':
            source = require('../../../../assets/exercises/front-raise-dumbbell/small.png');
            imageStyle = styles.front_raise_dumbbell;
            break;
        case 'Glute-Ham Raise':
            source = require('../../../../assets/exercises/glute-ham-raise/small.png');
            imageStyle = styles.glute_ham_raise;
            break;
        case 'Glute Kickback (Machine)':
            source = require('../../../../assets/exercises/glute-kickback-machine/small.png');
            imageStyle = styles.glute_kickback_machine;
            break;
        case 'Goblet Squat (Dumbbell)':
            source = require('../../../../assets/exercises/goblet-squat-dumbbell/small.png');
            imageStyle = styles.goblet_squat_dumbbell;
            break;
        case 'Good Morning (Barbell)':
            source = require('../../../../assets/exercises/good-morning-barbell/small.png');
            imageStyle = styles.good_morning_barbell;
            break;
        case 'Hack Squat (Sled Machine)':
            source = require('../../../../assets/exercises/hack-squat-sled-machine/small.png');
            imageStyle = styles.hack_squat_sled_machine;
            break;
        case 'Hammer Curl (Band)':
            source = require('../../../../assets/exercises/hammer-curl-band/small.png');
            imageStyle = styles.hammer_curl_band;
            break;
        case 'Hammer Curl (Cable)':
            source = require('../../../../assets/exercises/hammer-curl-cable/small.png');
            imageStyle = styles.hammer_curl_cable;
            break;
        case 'Hammer Curl (Dumbbell)':
            source = require('../../../../assets/exercises/hammer-curl-dumbbell/small.png');
            imageStyle = styles.hammer_curl_dumbbell;
            break;
        case 'Handstand Push-Up':
            source = require('../../../../assets/exercises/handstand-push-up/small.png');
            imageStyle = styles.handstand_push_up;
            break;
        case 'Hang Clean (Barbell)':
            source = require('../../../../assets/exercises/hang-clean-barbell/small.png');
            imageStyle = styles.hang_clean_barbell;
            break;
        case 'Hang Snatch (Barbell)':
            source = require('../../../../assets/exercises/hang-snatch-barbell/small.png');
            imageStyle = styles.hang_snatch_barbell;
            break;
        case 'Hanging Knees to Elbows':
            source = require('../../../../assets/exercises/hanging-knees-to-elbows/small.png');
            imageStyle = styles.hanging_knees_to_elbows;
            break;
        case 'Hanging Leg Raise':
            source = require('../../../../assets/exercises/hanging-leg-raise/small.png');
            imageStyle = styles.hanging_leg_raise;
            break;
        case 'Hanging Toes to Bar':
            source = require('../../../../assets/exercises/hanging-toes-to-bar/small.png');
            imageStyle = styles.hanging_toes_to_bar;
            break;
        case 'Hip Adduction (Machine)':
            source = require('../../../../assets/exercises/hip-adduction-machine/small.png');
            imageStyle = styles.hip_adduction_machine;
            break;
        case 'Hip Thrust (Barbell)':
            source = require('../../../../assets/exercises/hip-thrust-barbell/small.png');
            imageStyle = styles.hip_thrust_barbell;
            break;
        case 'Incline Bench (Barbell)':
            source = require('../../../../assets/exercises/incline-bench-barbell/small.png');
            imageStyle = styles.incline_bench_barbell;
            break;
        case 'Incline Bench Press (Cable)':
            source = require('../../../../assets/exercises/incline-bench-press-cable/small.png');
            imageStyle = styles.incline_bench_press_cable;
            break;
        case 'Incline Bench Press (Dumbbell)':
            source = require('../../../../assets/exercises/incline-bench-press-dumbbell/small.png');
            imageStyle = styles.incline_bench_press_dumbbell;
            break;
        case 'Incline Bench (Smith Machine)':
            source = require('../../../../assets/exercises/incline-bench-smith-machine/small.png');
            imageStyle = styles.incline_bench_smith_machine;
            break;
        case 'Incline Bicep Curl (Dumbbell)':
            source = require('../../../../assets/exercises/incline-bicep-curl-dumbbell/small.png');
            imageStyle = styles.incline_bicep_curl_dumbbell;
            break;
        case 'Incline Chest Press (Machine)':
            source = require('../../../../assets/exercises/incline-chess-press-machine/small.png');
            imageStyle = styles.incline_chess_press_machine;
            break;
        case 'Incline Fly (Dumbbell)':
            source = require('../../../../assets/exercises/incline-fly-dumbbell/small.png');
            imageStyle = styles.incline_fly_dumbbell;
            break;
        case 'Incline Row (Barbell)':
            source = require('../../../../assets/exercises/incline-row-barbell/small.png');
            imageStyle = styles.incline_row_barbell;
            break;
        case 'Incline Row (Dumbbell)':
            source = require('../../../../assets/exercises/incline-row-dumbbell/small.png');
            imageStyle = styles.incline_row_dumbbell;
            break;
        case 'Inverted Row':
            source = require('../../../../assets/exercises/inverted-row/small.png');
            imageStyle = styles.inverted_row;
            break;
        case 'Jerk (Barbell)':
            source = require('../../../../assets/exercises/jerk-barbell/small.png');
            imageStyle = styles.jerk_barbell;
            break;
        case 'Jump Shrug (Barbell)':
            source = require('../../../../assets/exercises/jump-shrug-barbell/small.png');
            imageStyle = styles.jump_shrug_barbell;
            break;
        case 'Jump Squat':
            source = require('../../../../assets/exercises/jump-squat/small.png');
            imageStyle = styles.jump_squat;
            break;
        case 'Kettlebell Swing':
            source = require('../../../../assets/exercises/kettlebell-swing/small.png');
            imageStyle = styles.kettlebell_swing;
            break;
        case 'Kettlebell Turkish Get-Up':
            source = require('../../../../assets/exercises/kettlebell-turkish-get-up/small.png');
            imageStyle = styles.kettlebell_turkish_get_up;
            break;
        case 'Knee Push-Up':
            source = require('../../../../assets/exercises/knee-push-up/small.png');
            imageStyle = styles.knee_push_up;
            break;
        case 'Lat Pulldown (Cable)':
            source = require('../../../../assets/exercises/lat-pulldown-cable/small.png');
            imageStyle = styles.lat_pulldown_cable;
            break;
        case 'Lat Pulldown (Machine)':
            source = require('../../../../assets/exercises/lat-pulldown-machine/small.png');
            imageStyle = styles.lat_pulldown_machine;
            break;
        case 'Lateral Raise (Band)':
            source = require('../../../../assets/exercises/lateral-raise-band/small.png');
            imageStyle = styles.lateral_raise_band;
            break;
        case 'Lateral Raise (Cable)':
            source = require('../../../../assets/exercises/lateral-raise-cable/small.png');
            imageStyle = styles.lateral_raise_cable;
            break;
        case 'Lateral Raise (Dumbbell)':
            source = require('../../../../assets/exercises/lateral-raise-dumbbell/small.png');
            imageStyle = styles.lateral_raise_dumbbell;
            break;
        case 'Lateral Raise (Machine)':
            source = require('../../../../assets/exercises/lateral-raise-machine/small.png');
            imageStyle = styles.lateral_raise_machine;
            break;
        case 'Leg Curl (Machine)':
            source = require('../../../../assets/exercises/leg-curl-machine/small.png');
            imageStyle = styles.leg_curl_machine;
            break;
        case 'Leg Extension (Machine)':
            source = require('../../../../assets/exercises/leg-extension-machine/small.png');
            imageStyle = styles.leg_extension_machine;
            break;
        case 'Leg Press (Machine)':
            source = require('../../../../assets/exercises/leg-press-machine/small.png');
            imageStyle = styles.leg_press_machine;
            break;
        case 'Leg Raise':
            source = require('../../../../assets/exercises/leg-raise/small.png');
            imageStyle = styles.leg_raise;
            break;
        case 'Leg Raise (Captain\'s Chair)':
            source = require('../../../../assets/exercises/leg-raise-captains-chair/small.png');
            imageStyle = styles.leg_raise_captains_chair;
            break;
        case 'Lunge':
            source = require('../../../../assets/exercises/lunge/small.png');
            imageStyle = styles.lunge;
            break;
        case 'Lunge (Barbell)':
            source = require('../../../../assets/exercises/lunge-barbell/small.png');
            imageStyle = styles.lunge_barbell;
            break;
        case 'Lunge (Dumbbell)':
            source = require('../../../../assets/exercises/lunge-dumbbell/small.png');
            imageStyle = styles.lunge_dumbbell;
            break;
        case 'Lying Knee Raise':
            source = require('../../../../assets/exercises/lying-knee-raise/small.png');
            imageStyle = styles.lying_knee_raise;
            break;
        case 'Lying Leg Curl (Machine)':
            source = require('../../../../assets/exercises/lying-leg-curl-machine/small.png');
            imageStyle = styles.lying_leg_curl_machine;
            break;
        case 'Muscle-Up':
            source = require('../../../../assets/exercises/muscle-up/small.png');
            imageStyle = styles.muscle_up;
            break;
        case 'Oblique Crunch':
            source = require('../../../../assets/exercises/oblique-crunch/small.png');
            imageStyle = styles.oblique_crunch;
            break;
        case 'One-Arm Curl (Cable)':
            source = require('../../../../assets/exercises/one-arm-curl-cable/small.png');
            imageStyle = styles.one_arm_curl_cable;
            break;
        case 'Overhead Squat (Barbell)':
            source = require('../../../../assets/exercises/overhead-squat-barbell/small.png');
            imageStyle = styles.overhead_squat_barbell;
            break;
        case 'Overhead Tricep Extension (Barbell)':
            source = require('../../../../assets/exercises/overhead-tricep-extension-barbell/small.png');
            imageStyle = styles.overhead_tricep_extension_barbell;
            break;
        case 'Overhead Tricep Extension (Cable)':
            source = require('../../../../assets/exercises/overhead-tricep-extension-cable/small.png');
            imageStyle = styles.overhead_tricep_extension_cable;
            break;
        case 'Pec Deck (Machine)':
            source = require('../../../../assets/exercises/pec-deck-machine/small.png');
            imageStyle = styles.pec_deck_machine;
            break;
        case 'Pendlay Row (Barbell)':
            source = require('../../../../assets/exercises/pendlay-row-barbell/small.png');
            imageStyle = styles.pendlay_row_barbell;
            break;
        case 'Pistol Squat':
            source = require('../../../../assets/exercises/pistol-squat/small.png');
            imageStyle = styles.pistol_squat;
            break;
        case 'Plank':
            source = require('../../../../assets/exercises/plank/medium.png');
            imageStyle = styles.plank;
            break;
        case 'Power Clean':
            source = require('../../../../assets/exercises/power-clean/small.png');
            imageStyle = styles.power_clean;
            break;
        case 'Preacher Curl (Barbell)':
            source = require('../../../../assets/exercises/preacher-curl-barbell/small.png');
            imageStyle = styles.preacher_curl_barbell;
            break;
        case 'Preacher Curl (Dumbbell)':
            source = require('../../../../assets/exercises/preacher-curl-dumbbell/small.png');
            imageStyle = styles.preacher_curl_dumbbell;
            break;
        case 'Preacher Curl (Machine)':
            source = require('../../../../assets/exercises/preacher-curl-machine/small.png');
            imageStyle = styles.preacher_curl_machine;
            break;
        case 'Press Under (Barbell)':
            source = require('../../../../assets/exercises/press-under-barbell/small.png');
            imageStyle = styles.press_under_barbell;
            break;
        case 'Pull Through (Cable)':
            source = require('../../../../assets/exercises/pull-through-cable/small.png');
            imageStyle = styles.pull_through_cable;
            break;
        case 'Pull-Up':
            source = require('../../../../assets/exercises/pull-up/small.png');
            imageStyle = styles.pull_up;
            break;
        case 'Pull-Up (Assisted)':
            source = require('../../../../assets/exercises/pull-up-assisted/small.png');
            imageStyle = styles.pull_up_assisted;
            break;
        case 'Pullover (Dumbbell)':
            source = require('../../../../assets/exercises/pullover-dumbell/small.png');
            imageStyle = styles.pullover_dumbell;
            break;
        case 'Pullover (Machine)':
            source = require('../../../../assets/exercises/pullover-machine/small.png');
            imageStyle = styles.pullover_machine;
            break;
        case 'Push-Up':
            source = require('../../../../assets/exercises/push-up/small.png');
            imageStyle = styles.push_up;
            break;
        case 'Push-Up (Band)':
            source = require('../../../../assets/exercises/push-up-band/small.png');
            imageStyle = styles.push_up_band;
            break;
        case 'Pushdown (Cable)':
            source = require('../../../../assets/exercises/pushdown-cable/small.png');
            imageStyle = styles.pushdown_cable;
            break;
        case 'Rack Pull (Barbell)':
            source = require('../../../../assets/exercises/rack-pull-barbell/small.png');
            imageStyle = styles.rack_pull_barbell;
            break;
        case 'Raise (Dumbbell)':
            source = require('../../../../assets/exercises/raise-dumbbell/small.png');
            imageStyle = styles.raise_dumbbell;
            break;
        case 'Rear Fly (Dumbbell)':
            source = require('../../../../assets/exercises/rear-fly-dumbbell/small.png');
            imageStyle = styles.rear_fly_dumbbell;
            break;
        case 'Reverse Concentration Curl (Dumbbell)':
            source = require('../../../../assets/exercises/reverse-concentration-curl-dumbbell/small.png');
            imageStyle = styles.reverse_concentration_curl_dumbbell;
            break;
        case 'Reverse Crunch':
            source = require('../../../../assets/exercises/reverse-crunch/small.png');
            imageStyle = styles.reverse_crunch;
            break;
        case 'Reverse Curl (Barbell)':
            source = require('../../../../assets/exercises/reverse-curl-barbell/small.png');
            imageStyle = styles.reverse_curl_barbell;
            break;
        case 'Reverse Curl (Dumbbell)':
            source = require('../../../../assets/exercises/reverse-curl-dumbbell/small.png');
            imageStyle = styles.reverse_curl_dumbbell;
            break;
        case 'Reverse Fly (Cable)':
            source = require('../../../../assets/exercises/reverse-fly-cable/small.png');
            imageStyle = styles.reverse_fly_cable;
            break;
        case 'Reverse Fly (Dumbbell)':
            source = require('../../../../assets/exercises/reverse-fly-dumbbell/small.png');
            imageStyle = styles.reverse_fly_dumbbell;
            break;
        case 'Reverse Fly (Machine)':
            source = require('../../../../assets/exercises/reverse-fly-machine/small.png');
            imageStyle = styles.reverse_fly_machine;
            break;
        case 'Reverse-Grip Bent-Over Row (Barbell)':
            source = require('../../../../assets/exercises/reverse-grip-bent-over-row-barbell/small.png');
            imageStyle = styles.reverse_grip_bent_over_row_barbell;
            break;
        case 'Reverse Plank':
            source = require('../../../../assets/exercises/reverse-plank/small.png');
            imageStyle = styles.reverse_plank;
            break;
        case 'Reverse Preacher Curl (Barbell)':
            source = require('../../../../assets/exercises/reverse-preacher-curl-barbell/small.png');
            imageStyle = styles.reverse_preacher_curl_barbell;
            break;
        case 'Reverse Preacher Curl (Dumbbell)':
            source = require('../../../../assets/exercises/reverse-preacher-curl-dumbbell/small.png');
            imageStyle = styles.reverse_preacher_curl_dumbbell;
            break;
        case 'Reverse Wrist Curl (Dumbbell)':
            source = require('../../../../assets/exercises/reverse-wrist-curl-dumbbell/small.png');
            imageStyle = styles.reverse_wrist_curl_dumbbell;
            break;
        case 'Romanian Deadlift (Dumbbell)':
            source = require('../../../../assets/exercises/romanian-deadlift-dumbbell/small.png');
            imageStyle = styles.romanian_deadlift_dumbbell;
            break;
        case 'Russian Twist':
            source = require('../../../../assets/exercises/russian-twist/small.png');
            imageStyle = styles.russian_twist;
            break;
        case 'Seated Calf Press (Machine)':
            source = require('../../../../assets/exercises/seated-calf-press-machine/small.png');
            imageStyle = styles.seated_calf_press_machine;
            break;
        case 'Seated Calf Raise (Machine)':
            source = require('../../../../assets/exercises/seated-calf-raise-machine/small.png');
            imageStyle = styles.seated_calf_raise_machine;
            break;
        case 'Seated Crunch (Machine)':
            source = require('../../../../assets/exercises/seated-crunch-machine/small.png');
            imageStyle = styles.seated_crunch_machine;
            break;
        case 'Seated Row (Cable)':
            source = require('../../../../assets/exercises/seated-row-cable/small.png');
            imageStyle = styles.seated_row_cable;
            break;
        case 'Seated Row (Machine)':
            source = require('../../../../assets/exercises/seated-row-machine/small.png');
            imageStyle = styles.seated_row_machine;
            break;
        case 'Seated Shoulder Press (Barbell)':
            source = require('../../../../assets/exercises/seated-shoulder-press-barbell/small.png');
            imageStyle = styles.seated_shoulder_press_barbell;
            break;
        case 'Seated Single Leg Press (Machine)':
            source = require('../../../../assets/exercises/seated-single-leg-press-machine/small.png');
            imageStyle = styles.seated_single_leg_press_machine;
            break;
        case 'Seated Wrist Curl (Dumbbell)':
            source = require('../../../../assets/exercises/seated-wrist-curl-dumbbell/small.png');
            imageStyle = styles.seated_wrist_curl_dumbbell;
            break;
        case 'Shoulder Press (Barbell)':
            source = require('../../../../assets/exercises/shoulder-press-barbell/small.png');
            imageStyle = styles.shoulder_press_barbell;
            break;
        case 'Shoulder Press (Cable)':
            source = require('../../../../assets/exercises/shoulder-press-cable/small.png');
            imageStyle = styles.shoulder_press_cable;
            break;
        case 'Shoulder Press (Dumbbell)':
            source = require('../../../../assets/exercises/shoulder-press-dumbbell/small.png');
            imageStyle = styles.shoulder_press_dumbbell;
            break;
        case 'Shoulder Press (Machine)':
            source = require('../../../../assets/exercises/shoulder-press-machine/small.png');
            imageStyle = styles.shoulder_press_machine;
            break;
        case 'Shoulder Press (Smith Machine)':
            source = require('../../../../assets/exercises/shoulder-press-smith-machine/small.png');
            imageStyle = styles.shoulder_press_smith_machine;
            break;
        case 'Shrug (Barbell)':
            source = require('../../../../assets/exercises/shrug-barbell/small.png');
            imageStyle = styles.shrug_barbell;
            break;
        case 'Shrug (Dumbbell)':
            source = require('../../../../assets/exercises/shrug-dumbbell/small.png');
            imageStyle = styles.shrug_dumbbell;
            break;
        case 'Shrug (Machine)':
            source = require('../../../../assets/exercises/shrug-machine/small.png');
            imageStyle = styles.shrug_machine;
            break;
        case 'Shrug (Smith Machine)':
            source = require('../../../../assets/exercises/shrug-smith-machine/small.png');
            imageStyle = styles.shrug_smith_machine;
            break;
        case 'Side Bend (Cable)':
            source = require('../../../../assets/exercises/side-bend-cable/small.png');
            imageStyle = styles.side_bend_cable;
            break;
        case 'Side Bend (Dumbbell)':
            source = require('../../../../assets/exercises/side-bend-dumbbell/small.png');
            imageStyle = styles.side_bend_dumbbell;
            break;
        case 'Side Plank':
            source = require('../../../../assets/exercises/side-plank/small.png');
            imageStyle = styles.side_plank;
            break;
        case 'Single-Arm Lat Pulldown (Cable)':
            source = require('../../../../assets/exercises/single-arm-lat-pulldown-cable/small.png');
            imageStyle = styles.single_arm_lat_pulldown_cable;
            break;
        case 'Single-Arm Tricep Extension (Cable)':
            source = require('../../../../assets/exercises/single-arm-tricep-extension-cable/small.png');
            imageStyle = styles.single_arm_tricep_extension_cable;
            break;
        case 'Sit-Up':
            source = require('../../../../assets/exercises/sit-up/small.png');
            imageStyle = styles.sit_up;
            break;
        case 'Skullcrusher (Barbell)':
            source = require('../../../../assets/exercises/skullcrusher-barbell/small.png');
            imageStyle = styles.skullcrusher_barbell;
            break;
        case 'Skullcrusher (Dumbbell)':
            source = require('../../../../assets/exercises/skullcrusher-dumbbell/small.png');
            imageStyle = styles.skullcrusher_dumbbell;
            break;
        case 'Snatch (Barbell)':
            source = require('../../../../assets/exercises/snatch-barbell/small.png');
            imageStyle = styles.snatch_barbell;
            break;
        case 'Snatch Pull (Barbell)':
            source = require('../../../../assets/exercises/snatch-pull-barbell/small.png');
            imageStyle = styles.snatch_pull_barbell;
            break;
        case 'Squat':
            source = require('../../../../assets/exercises/squat/small.png');
            imageStyle = styles.squat;
            break;
        case 'Squat (Band)':
            source = require('../../../../assets/exercises/squat-band/small.png');
            imageStyle = styles.squat_band;
            break;
        case 'Squat (Dumbbell)':
            source = require('../../../../assets/exercises/squat-dumbbell/small.png');
            imageStyle = styles.squat_dumbbell;
            break;
        case 'Squat (Machine)':
            source = require('../../../../assets/exercises/squat-machine/small.png');
            imageStyle = styles.squat_machine;
            break;
        case 'Squat (Smith Machine)':
            source = require('../../../../assets/exercises/squat-smith-machine/small.png');
            imageStyle = styles.squat_smith_machine;
            break;
        case 'Stability Ball Crunch':
            source = require('../../../../assets/exercises/stability-ball-crunch/small.png');
            imageStyle = styles.stability_ball_crunch;
            break;
        case 'Standing Calf Raise (Barbell)':
            source = require('../../../../assets/exercises/standing-calf-raise-barbell/small.png');
            imageStyle = styles.standing_calf_raise_barbell;
            break;
        case 'Standing Calf Raise (Machine)':
            source = require('../../../../assets/exercises/standing-calf-raise-machine/small.png');
            imageStyle = styles.standing_calf_raise_machine;
            break;
        case 'Standing Face Pull (Cable)':
            source = require('../../../../assets/exercises/standing-face-pull-cable/small.png');
            imageStyle = styles.standing_face_pull_cable;
            break;
        case 'Standing Preacher Curl (Dumbbell)':
            source = require('../../../../assets/exercises/standing-preacher-curl-dumbbell/small.png');
            imageStyle = styles.standing_preacher_curl_dumbbell;
            break;
        case 'Standing Tricep Extension (Dumbbell)':
            source = require('../../../../assets/exercises/standing-tricep-extention-dumbbell/small.png');
            imageStyle = styles.standing_tricep_extention_dumbbell;
            break;
        case 'Stiff-Leg Deadlift (Band)':
            source = require('../../../../assets/exercises/stiff-leg-deadlift-band/small.png');
            imageStyle = styles.stiff_leg_deadlift_band;
            break;
        case 'Stiff-Leg Deadlift (Barbell)':
            source = require('../../../../assets/exercises/stiff-leg-deadlift-barbell/small.png');
            imageStyle = styles.stiff_leg_deadlift_barbell;
            break;
        case 'Stiff-Leg Deadlift (Dumbbell)':
            source = require('../../../../assets/exercises/stiff-leg-deadlift-dumbbell/small.png');
            imageStyle = styles.stiff_leg_deadlift_dumbbell;
            break;
        case 'Sumo Deadlift (Barbell)':
            source = require('../../../../assets/exercises/sumo-deadlift-barbell/small.png');
            imageStyle = styles.sumo_deadlift_barbell;
            break;
        case 'Sumo Deadlift High Pull':
            source = require('../../../../assets/exercises/sumo-deadlift-high-pull/small.png');
            imageStyle = styles.sumo_deadlift_high_pull;
            break;
        case 'Thruster (Barbell)':
            source = require('../../../../assets/exercises/thruster-barbell/small.png');
            imageStyle = styles.thruster_barbell;
            break;
        case 'Thruster (Dumbbell)':
            source = require('../../../../assets/exercises/thruster-dumbbell/small.png');
            imageStyle = styles.thruster_dumbbell;
            break;
        case 'Torso Rotation (Machine)':
            source = require('../../../../assets/exercises/torso-rotation-machine/small.png');
            imageStyle = styles.torso_rotation_machine;
            break;
        case 'Tricep Extension (Machine)':
            source = require('../../../../assets/exercises/tricep-extension-machine/small.png');
            imageStyle = styles.tricep_extension_machine;
            break;
        case 'Twist (Cable)':
            source = require('../../../../assets/exercises/twist-cable/small.png');
            imageStyle = styles.twist_cable;
            break;
        case 'Upright Row (Barbell)':
            source = require('../../../../assets/exercises/upright-row-barbell/small.png');
            imageStyle = styles.upright_row_barbell;
            break;
        case 'Upright Row (Cable)':
            source = require('../../../../assets/exercises/upright-row-cable/small.png');
            imageStyle = styles.upright_row_cable;
            break;
        case 'Upright Row (Dumbbell)':
            source = require('../../../../assets/exercises/upright-row-dumbbell/small.png');
            imageStyle = styles.upright_row_dumbbell;
            break;
        case 'V-Up':
            source = require('../../../../assets/exercises/v-up/small.png');
            imageStyle = styles.v_up;
            break;
        case 'Wide Bench Press (Barbell)':
            source = require('../../../../assets/exercises/wide-bench-press-barbell/small.png');
            imageStyle = styles.wide_bench_press_barbell;
            break;
        case 'Wide Pull-Up':
            source = require('../../../../assets/exercises/wide-pull-up/small.png');
            imageStyle = styles.wide_pull_up;
            break;
        case 'Wrist Roller':
            source = require('../../../../assets/exercises/wrist-roller/small.png');
            imageStyle = styles.wrist_roller;
            break;
        case 'Zercher Squat (Barbell)':
            source = require('../../../../assets/exercises/zercher-squat-barbell/small.png');
            imageStyle = styles.zercher_squat_barbell;
            break;
    }

    return (
        <View style={styles.imageContainer}>
            <Image source={source} style={[styles.image, imageStyle]} />
        </View>
    );
}

const styles = StyleSheet.create({
    imageContainer: {
        width: 55,
        aspectRatio: 1,
        overflow: 'hidden',
    },
    image: {
        width: 135,
        height: 135,
        resizeMode: 'cover',
    },
    defaultImage: {
        transform: [
            { scale: 1 },
            { translateX: -80.5 },
            { translateY: -20.5 }
        ],
    },
    _45_degree_leg_press_machine: {
        transform: [
            { scale: 1 },
            { translateX: -75 },
            { translateY: -18 }
        ],
    },
    t_bar_row_machine: {
        transform: [
            { scale: 1 },
            { translateX: -80 },
            { translateY: -20 }
        ],
    },
    ab_wheel_rollout: {
        transform: [
            { scale: 0.9 },
            { translateX: -85 },
            { translateY: -25 }
        ],
    },
    arnold_press_dumbbell: {
        transform: [
            { scale: 1 },
            { translateX: -80 },
            { translateY: -22 }
        ],
    },
    around_the_world_dumbbell: {
        transform: [
            { scale: 1 },
            { translateX: -82 },
            { translateY: -21 }
        ],
    },
    assisted_pull_up_band: {
        transform: [
            { scale: 1.1 },
            { translateX: -78 },
            { translateY: -18 }
        ],
    },
    back_extension: {
        transform: [
            { scale: 1 },
            { translateX: -80 },
            { translateY: -19 }
        ],
    },
    back_extension_machine: {
        transform: [
            { scale: 1.2 },
            { translateX: -74 },
            { translateY: -17 }
        ],
    },
    back_squat_barbell: {
        transform: [
            { scale: 1 },
            { translateX: -79 },
            { translateY: -20 }
        ],
    },
    ball_slam: {
        transform: [
            { scale: 1 },
            { translateX: -80.5 },
            { translateY: -20.5 }
        ],
    },
    bench_dip: {
        transform: [
            { scale: 1 },
            { translateX: -75 },
            { translateY: -18 }
        ],
    },
    bench_press_barbell: {
        transform: [
            { scale: 1 },
            { translateX: -80 },
            { translateY: -20 }
        ],
    },
    bench_press_cable: {
        transform: [
            { scale: 0.9 },
            { translateX: -85 },
            { translateY: -25 }
        ],
    },
    bench_press_dumbbell: {
        transform: [
            { scale: 1 },
            { translateX: -80 },
            { translateY: -22 }
        ],
    },
    bench_press_smith_machine: {
        transform: [
            { scale: 1 },
            { translateX: -82 },
            { translateY: -21 }
        ],
    },
    bench_split_squat: {
        transform: [
            { scale: 1.1 },
            { translateX: -78 },
            { translateY: -18 }
        ],
    },
    bench_squat_barbell: {
        transform: [
            { scale: 1 },
            { translateX: -80 },
            { translateY: -19 }
        ],
    },
    bent_over_row_band: {
        transform: [
            { scale: 1.2 },
            { translateX: -74 },
            { translateY: -17 }
        ],
    },
    bent_over_row_barbell: {
        transform: [
            { scale: 1 },
            { translateX: -79 },
            { translateY: -20 }
        ],
    },
    bent_over_row_dumbbell: {
        transform: [
            { scale: 1 },
            { translateX: -80.5 },
            { translateY: -20.5 }
        ],
    },
    bicep_curl_barbell: {
        transform: [
            { scale: 1 },
            { translateX: -75 },
            { translateY: -18 }
        ],
    },
    bicep_curl_dumbbell: {
        transform: [
            { scale: 1 },
            { translateX: -80 },
            { translateY: -20 }
        ],
    },
    bicep_curl_machine: {
        transform: [
            { scale: 0.9 },
            { translateX: -85 },
            { translateY: -25 }
        ],
    },
    biceps_curl_cable: {
        transform: [
            { scale: 1 },
            { translateX: -80 },
            { translateY: -22 }
        ],
    },
    bicycle_crunch: {
        transform: [
            { scale: 1 },
            { translateX: -82 },
            { translateY: -21 }
        ],
    },
    box_jump: {
        transform: [
            { scale: 1.1 },
            { translateX: -78 },
            { translateY: -18 }
        ],
    },
    burpee: {
        transform: [
            { scale: 1 },
            { translateX: -80 },
            { translateY: -19 }
        ],
    },
    calf_raise_dumbbell: {
        transform: [
            { scale: 1.2 },
            { translateX: -74 },
            { translateY: -17 }
        ],
    },
    calf_raise_on_45_degree_leg_press_machine: {
        transform: [
            { scale: 1 },
            { translateX: -79 },
            { translateY: -20 }
        ],
    },
    calf_raise_on_leg_press_machine: {
        transform: [
            { scale: 1 },
            { translateX: -80.5 },
            { translateY: -20.5 }
        ],
    },
    calf_raise_smith_machine: {
        transform: [
            { scale: 1 },
            { translateX: -75 },
            { translateY: -18 }
        ],
    },
    chest_dip: {
        transform: [
            { scale: 1 },
            { translateX: -80 },
            { translateY: -20 }
        ],
    },
    chest_dip_assisted: {
        transform: [
            { scale: 0.9 },
            { translateX: -85 },
            { translateY: -25 }
        ],
    },
    chest_fly_cable: {
        transform: [
            { scale: 1 },
            { translateX: -80 },
            { translateY: -22 }
        ],
    },
    chest_fly_dumbbell: {
        transform: [
            { scale: 1 },
            { translateX: -82 },
            { translateY: -21 }
        ],
    },
    chest_fly_machine: {
        transform: [
            { scale: 1.1 },
            { translateX: -78 },
            { translateY: -18 }
        ],
    },
    chest_press_machine: {
        transform: [
            { scale: 1 },
            { translateX: -80 },
            { translateY: -19 }
        ],
    },
    chin_up: {
        transform: [
            { scale: 1.2 },
            { translateX: -74 },
            { translateY: -17 }
        ],
    },
    chin_up_assisted: {
        transform: [
            { scale: 1 },
            { translateX: -79 },
            { translateY: -20 }
        ],
    },
    clean_and_jerk_barbell: {
        transform: [
            { scale: 1 },
            { translateX: -80.5 },
            { translateY: -20.5 }
        ],
    },
    clean_high_pull_barbell: {
        transform: [
            { scale: 1 },
            { translateX: -75 },
            { translateY: -18 }
        ],
    },
    close_grip_bench_press_barbell: {
        transform: [
            { scale: 1 },
            { translateX: -80 },
            { translateY: -20 }
        ],
    },
    concentration_curl_dumbbell: {
        transform: [
            { scale: 0.9 },
            { translateX: -85 },
            { translateY: -25 }
        ],
    },
    cross_body_crunch: {
        transform: [
            { scale: 1 },
            { translateX: -80 },
            { translateY: -22 }
        ],
    },
    crunch: {
        transform: [
            { scale: 1 },
            { translateX: -82 },
            { translateY: -21 }
        ],
    },
    crunch_cable: {
        transform: [
            { scale: 1.1 },
            { translateX: -78 },
            { translateY: -18 }
        ],
    },
    deadlift_band: {
        transform: [
            { scale: 1 },
            { translateX: -80 },
            { translateY: -19 }
        ],
    },
    deadlift_barbell: {
        transform: [
            { scale: 1.2 },
            { translateX: -74 },
            { translateY: -17 }
        ],
    },
    deadlift_dumbbell: {
        transform: [
            { scale: 1 },
            { translateX: -79 },
            { translateY: -20 }
        ],
    },
    deadlift_from_deficit_barbell: {
        transform: [
            { scale: 1 },
            { translateX: -80.5 },
            { translateY: -20.5 }
        ],
    },
    deadlift_smith_machine: {
        transform: [
            { scale: 1 },
            { translateX: -75 },
            { translateY: -18 }
        ],
    },
    deadlift_trap_bar: {
        transform: [
            { scale: 1 },
            { translateX: -80 },
            { translateY: -20 }
        ],
    },
    decline_bench_press_barbell: {
        transform: [
            { scale: 0.9 },
            { translateX: -85 },
            { translateY: -25 }
        ],
    },
    decline_bench_press_dumbbell: {
        transform: [
            { scale: 1 },
            { translateX: -80 },
            { translateY: -22 }
        ],
    },
    decline_bench_smith_machine: {
        transform: [
            { scale: 1 },
            { translateX: -82 },
            { translateY: -21 }
        ],
    },
    decline_crunch: {
        transform: [
            { scale: 1.1 },
            { translateX: -78 },
            { translateY: -18 }
        ],
    },
    decline_sit_up: {
        transform: [
            { scale: 1 },
            { translateX: -80 },
            { translateY: -19 }
        ],
    },
    floor_press_barbell: {
        transform: [
            { scale: 1.2 },
            { translateX: -74 },
            { translateY: -17 }
        ],
    },
    front_raise: {
        transform: [
            { scale: 1 },
            { translateX: -79 },
            { translateY: -20 }
        ],
    },
    front_raise_band: {
        transform: [
            { scale: 1 },
            { translateX: -80.5 },
            { translateY: -20.5 }
        ],
    },
    front_raise_barbell: {
        transform: [
            { scale: 1 },
            { translateX: -75 },
            { translateY: -18 }
        ],
    },
    front_raise_cable: {
        transform: [
            { scale: 1 },
            { translateX: -80 },
            { translateY: -20 }
        ],
    },
    front_raise_dumbbell: {
        transform: [
            { scale: 0.9 },
            { translateX: -85 },
            { translateY: -25 }
        ],
    },
    glute_ham_raise: {
        transform: [
            { scale: 1 },
            { translateX: -80 },
            { translateY: -22 }
        ],
    },
    glute_kickback_machine: {
        transform: [
            { scale: 1 },
            { translateX: -82 },
            { translateY: -21 }
        ],
    },
    goblet_squat_dumbbell: {
        transform: [
            { scale: 1.1 },
            { translateX: -78 },
            { translateY: -18 }
        ],
    },
    good_morning_barbell: {
        transform: [
            { scale: 1 },
            { translateX: -80 },
            { translateY: -19 }
        ],
    },
    hack_squat_sled_machine: {
        transform: [
            { scale: 1.2 },
            { translateX: -74 },
            { translateY: -17 }
        ],
    },
    hammer_curl_band: {
        transform: [
            { scale: 1 },
            { translateX: -79 },
            { translateY: -20 }
        ],
    },
    hammer_curl_cable: {
        transform: [
            { scale: 1 },
            { translateX: -80.5 },
            { translateY: -20.5 }
        ],
    },
    hammer_curl_dumbbell: {
        transform: [
            { scale: 1 },
            { translateX: -75 },
            { translateY: -18 }
        ],
    },
    handstand_push_up: {
        transform: [
            { scale: 1 },
            { translateX: -80 },
            { translateY: -20 }
        ],
    },
    hang_clean_barbell: {
        transform: [
            { scale: 0.9 },
            { translateX: -85 },
            { translateY: -25 }
        ],
    },
    hang_snatch_barbell: {
        transform: [
            { scale: 1 },
            { translateX: -80 },
            { translateY: -22 }
        ],
    },
    hanging_knees_to_elbows: {
        transform: [
            { scale: 1 },
            { translateX: -82 },
            { translateY: -21 }
        ],
    },
    hanging_leg_raise: {
        transform: [
            { scale: 1.1 },
            { translateX: -78 },
            { translateY: -18 }
        ],
    },
    hanging_toes_to_bar: {
        transform: [
            { scale: 1 },
            { translateX: -80 },
            { translateY: -19 }
        ],
    },
    hip_adduction_machine: {
        transform: [
            { scale: 1.2 },
            { translateX: -74 },
            { translateY: -17 }
        ],
    },
    hip_thrust_barbell: {
        transform: [
            { scale: 1 },
            { translateX: -79 },
            { translateY: -20 }
        ],
    },
    incline_bench_barbell: {
        transform: [
            { scale: 1 },
            { translateX: -80.5 },
            { translateY: -20.5 }
        ],
    },
    incline_bench_press_cable: {
        transform: [
            { scale: 1 },
            { translateX: -75 },
            { translateY: -18 }
        ],
    },
    incline_bench_press_dumbbell: {
        transform: [
            { scale: 1 },
            { translateX: -80 },
            { translateY: -20 }
        ],
    },
    incline_bench_smith_machine: {
        transform: [
            { scale: 0.9 },
            { translateX: -85 },
            { translateY: -25 }
        ],
    },
    incline_bicep_curl_dumbbell: {
        transform: [
            { scale: 1 },
            { translateX: -80 },
            { translateY: -22 }
        ],
    },
    incline_chess_press_machine: {
        transform: [
            { scale: 1 },
            { translateX: -82 },
            { translateY: -21 }
        ],
    },
    incline_fly_dumbbell: {
        transform: [
            { scale: 1.1 },
            { translateX: -78 },
            { translateY: -18 }
        ],
    },
    incline_row_barbell: {
        transform: [
            { scale: 1 },
            { translateX: -80 },
            { translateY: -19 }
        ],
    },
    incline_row_dumbbell: {
        transform: [
            { scale: 1.2 },
            { translateX: -74 },
            { translateY: -17 }
        ],
    },
    inverted_row: {
        transform: [
            { scale: 1 },
            { translateX: -79 },
            { translateY: -20 }
        ],
    },
    jerk_barbell: {
        transform: [
            { scale: 1 },
            { translateX: -80.5 },
            { translateY: -20.5 }
        ],
    },
    jump_shrug_barbell: {
        transform: [
            { scale: 1 },
            { translateX: -75 },
            { translateY: -18 }
        ],
    },
    jump_squat: {
        transform: [
            { scale: 1 },
            { translateX: -80 },
            { translateY: -20 }
        ],
    },
    kettlebell_swing: {
        transform: [
            { scale: 0.9 },
            { translateX: -85 },
            { translateY: -25 }
        ],
    },
    kettlebell_turkish_get_up: {
        transform: [
            { scale: 1 },
            { translateX: -80 },
            { translateY: -22 }
        ],
    },
    knee_push_up: {
        transform: [
            { scale: 1 },
            { translateX: -82 },
            { translateY: -21 }
        ],
    },
    lat_pulldown_cable: {
        transform: [
            { scale: 1.1 },
            { translateX: -78 },
            { translateY: -18 }
        ],
    },
    lat_pulldown_machine: {
        transform: [
            { scale: 1 },
            { translateX: -80 },
            { translateY: -19 }
        ],
    },
    lateral_raise_band: {
        transform: [
            { scale: 1.2 },
            { translateX: -74 },
            { translateY: -17 }
        ],
    },
    lateral_raise_cable: {
        transform: [
            { scale: 1 },
            { translateX: -79 },
            { translateY: -20 }
        ],
    },
    lateral_raise_dumbbell: {
        transform: [
            { scale: 1 },
            { translateX: -80.5 },
            { translateY: -20.5 }
        ],
    },
    lateral_raise_machine: {
        transform: [
            { scale: 1 },
            { translateX: -75 },
            { translateY: -18 }
        ],
    },
    leg_curl_machine: {
        transform: [
            { scale: 1 },
            { translateX: -80 },
            { translateY: -20 }
        ],
    },
    leg_extension_machine: {
        transform: [
            { scale: 0.9 },
            { translateX: -85 },
            { translateY: -25 }
        ],
    },
    leg_press_machine: {
        transform: [
            { scale: 1 },
            { translateX: -80 },
            { translateY: -22 }
        ],
    },
    leg_raise: {
        transform: [
            { scale: 1 },
            { translateX: -82 },
            { translateY: -21 }
        ],
    },
    leg_raise_captains_chair: {
        transform: [
            { scale: 1.1 },
            { translateX: -78 },
            { translateY: -18 }
        ],
    },
    lunge: {
        transform: [
            { scale: 1 },
            { translateX: -80 },
            { translateY: -19 }
        ],
    },
    lunge_barbell: {
        transform: [
            { scale: 1.2 },
            { translateX: -74 },
            { translateY: -17 }
        ],
    },
    lunge_dumbbell: {
        transform: [
            { scale: 1 },
            { translateX: -79 },
            { translateY: -20 }
        ],
    },
    lying_knee_raise: {
        transform: [
            { scale: 1 },
            { translateX: -80.5 },
            { translateY: -20.5 }
        ],
    },
    lying_leg_curl_machine: {
        transform: [
            { scale: 1 },
            { translateX: -75 },
            { translateY: -18 }
        ],
    },
    muscle_up: {
        transform: [
            { scale: 1 },
            { translateX: -80 },
            { translateY: -20 }
        ],
    },
    oblique_crunch: {
        transform: [
            { scale: 0.9 },
            { translateX: -85 },
            { translateY: -25 }
        ],
    },
    one_arm_curl_cable: {
        transform: [
            { scale: 1 },
            { translateX: -80 },
            { translateY: -22 }
        ],
    },
    overhead_squat_barbell: {
        transform: [
            { scale: 1 },
            { translateX: -82 },
            { translateY: -21 }
        ],
    },
    overhead_tricep_extension_barbell: {
        transform: [
            { scale: 1.1 },
            { translateX: -78 },
            { translateY: -18 }
        ],
    },
    overhead_tricep_extension_cable: {
        transform: [
            { scale: 1 },
            { translateX: -80 },
            { translateY: -19 }
        ],
    },
    pec_deck_machine: {
        transform: [
            { scale: 1.2 },
            { translateX: -74 },
            { translateY: -17 }
        ],
    },
    pendlay_row_barbell: {
        transform: [
            { scale: 1 },
            { translateX: -79 },
            { translateY: -20 }
        ],
    },
    pistol_squat: {
        transform: [
            { scale: 1 },
            { translateX: -80.5 },
            { translateY: -20.5 }
        ],
    },
    plank: {
        transform: [
            { scale: 1 },
            { translateX: -75 },
            { translateY: -18 }
        ],
    },
    power_clean: {
        transform: [
            { scale: 1 },
            { translateX: -80 },
            { translateY: -20 }
        ],
    },
    preacher_curl_barbell: {
        transform: [
            { scale: 0.9 },
            { translateX: -85 },
            { translateY: -25 }
        ],
    },
    preacher_curl_dumbbell: {
        transform: [
            { scale: 1 },
            { translateX: -80 },
            { translateY: -22 }
        ],
    },
    preacher_curl_machine: {
        transform: [
            { scale: 1 },
            { translateX: -82 },
            { translateY: -21 }
        ],
    },
    press_under_barbell: {
        transform: [
            { scale: 1.1 },
            { translateX: -78 },
            { translateY: -18 }
        ],
    },
    pull_through_cable: {
        transform: [
            { scale: 1 },
            { translateX: -80 },
            { translateY: -19 }
        ],
    },
    pull_up: {
        transform: [
            { scale: 1.2 },
            { translateX: -74 },
            { translateY: -17 }
        ],
    },
    pull_up_assisted: {
        transform: [
            { scale: 1 },
            { translateX: -79 },
            { translateY: -20 }
        ],
    },
    pullover_dumbell: {
        transform: [
            { scale: 1 },
            { translateX: -80.5 },
            { translateY: -20.5 }
        ],
    },
    pullover_machine: {
        transform: [
            { scale: 1 },
            { translateX: -75 },
            { translateY: -18 }
        ],
    },
    push_up: {
        transform: [
            { scale: 1 },
            { translateX: -80 },
            { translateY: -20 }
        ],
    },
    push_up_band: {
        transform: [
            { scale: 0.9 },
            { translateX: -85 },
            { translateY: -25 }
        ],
    },
    pushdown_cable: {
        transform: [
            { scale: 1 },
            { translateX: -80 },
            { translateY: -22 }
        ],
    },
    rack_pull_barbell: {
        transform: [
            { scale: 1 },
            { translateX: -82 },
            { translateY: -21 }
        ],
    },
    raise_dumbbell: {
        transform: [
            { scale: 1.1 },
            { translateX: -78 },
            { translateY: -18 }
        ],
    },
    rear_fly_dumbbell: {
        transform: [
            { scale: 1 },
            { translateX: -80 },
            { translateY: -19 }
        ],
    },
    reverse_concentration_curl_dumbbell: {
        transform: [
            { scale: 1.2 },
            { translateX: -74 },
            { translateY: -17 }
        ],
    },
    reverse_crunch: {
        transform: [
            { scale: 1 },
            { translateX: -79 },
            { translateY: -20 }
        ],
    },
    reverse_curl_barbell: {
        transform: [
            { scale: 1 },
            { translateX: -80.5 },
            { translateY: -20.5 }
        ],
    },
    reverse_curl_dumbbell: {
        transform: [
            { scale: 1 },
            { translateX: -75 },
            { translateY: -18 }
        ],
    },
    reverse_fly_cable: {
        transform: [
            { scale: 1 },
            { translateX: -80 },
            { translateY: -20 }
        ],
    },
    reverse_fly_dumbbell: {
        transform: [
            { scale: 0.9 },
            { translateX: -85 },
            { translateY: -25 }
        ],
    },
    reverse_fly_machine: {
        transform: [
            { scale: 1 },
            { translateX: -80 },
            { translateY: -22 }
        ],
    },
    reverse_grip_bent_over_row_barbell: {
        transform: [
            { scale: 1 },
            { translateX: -82 },
            { translateY: -21 }
        ],
    },
    reverse_plank: {
        transform: [
            { scale: 1.1 },
            { translateX: -78 },
            { translateY: -18 }
        ],
    },
    reverse_preacher_curl_barbell: {
        transform: [
            { scale: 1 },
            { translateX: -80 },
            { translateY: -19 }
        ],
    },
    reverse_preacher_curl_dumbbell: {
        transform: [
            { scale: 1.2 },
            { translateX: -74 },
            { translateY: -17 }
        ],
    },
    reverse_wrist_curl_dumbbell: {
        transform: [
            { scale: 1 },
            { translateX: -79 },
            { translateY: -20 }
        ],
    },
    romanian_deadlift_dumbbell: {
        transform: [
            { scale: 1 },
            { translateX: -80.5 },
            { translateY: -20.5 }
        ],
    },
    russian_twist: {
        transform: [
            { scale: 1 },
            { translateX: -75 },
            { translateY: -18 }
        ],
    },
    seated_calf_press_machine: {
        transform: [
            { scale: 1 },
            { translateX: -80 },
            { translateY: -20 }
        ],
    },
    seated_calf_raise_machine: {
        transform: [
            { scale: 0.9 },
            { translateX: -85 },
            { translateY: -25 }
        ],
    },
    seated_crunch_machine: {
        transform: [
            { scale: 1 },
            { translateX: -80 },
            { translateY: -22 }
        ],
    },
    seated_row_cable: {
        transform: [
            { scale: 1 },
            { translateX: -82 },
            { translateY: -21 }
        ],
    },
    seated_row_machine: {
        transform: [
            { scale: 1.1 },
            { translateX: -78 },
            { translateY: -18 }
        ],
    },
    seated_shoulder_press_barbell: {
        transform: [
            { scale: 1 },
            { translateX: -80 },
            { translateY: -19 }
        ],
    },
    seated_single_leg_press_machine: {
        transform: [
            { scale: 1.2 },
            { translateX: -74 },
            { translateY: -17 }
        ],
    },
    seated_wrist_curl_dumbbell: {
        transform: [
            { scale: 1 },
            { translateX: -79 },
            { translateY: -20 }
        ],
    },
    shoulder_press_barbell: {
        transform: [
            { scale: 1 },
            { translateX: -80.5 },
            { translateY: -20.5 }
        ],
    },
    shoulder_press_cable: {
        transform: [
            { scale: 1 },
            { translateX: -75 },
            { translateY: -18 }
        ],
    },
    shoulder_press_dumbbell: {
        transform: [
            { scale: 1 },
            { translateX: -80 },
            { translateY: -20 }
        ],
    },
    shoulder_press_machine: {
        transform: [
            { scale: 0.9 },
            { translateX: -85 },
            { translateY: -25 }
        ],
    },
    shoulder_press_smith_machine: {
        transform: [
            { scale: 1 },
            { translateX: -80 },
            { translateY: -22 }
        ],
    },
    shrug_barbell: {
        transform: [
            { scale: 1 },
            { translateX: -82 },
            { translateY: -21 }
        ],
    },
    shrug_dumbbell: {
        transform: [
            { scale: 1.1 },
            { translateX: -78 },
            { translateY: -18 }
        ],
    },
    shrug_machine: {
        transform: [
            { scale: 1 },
            { translateX: -80 },
            { translateY: -19 }
        ],
    },
    shrug_smith_machine: {
        transform: [
            { scale: 1.2 },
            { translateX: -74 },
            { translateY: -17 }
        ],
    },
    side_bend_cable: {
        transform: [
            { scale: 1 },
            { translateX: -79 },
            { translateY: -20 }
        ],
    },
    side_bend_dumbbell: {
        transform: [
            { scale: 1 },
            { translateX: -80.5 },
            { translateY: -20.5 }
        ],
    },
    side_plank: {
        transform: [
            { scale: 1 },
            { translateX: -75 },
            { translateY: -18 }
        ],
    },
    single_arm_lat_pulldown_cable: {
        transform: [
            { scale: 1 },
            { translateX: -80 },
            { translateY: -20 }
        ],
    },
    single_arm_tricep_extension_cable: {
        transform: [
            { scale: 0.9 },
            { translateX: -85 },
            { translateY: -25 }
        ],
    },
    sit_up: {
        transform: [
            { scale: 1 },
            { translateX: -80 },
            { translateY: -22 }
        ],
    },
    skullcrusher_barbell: {
        transform: [
            { scale: 1 },
            { translateX: -82 },
            { translateY: -21 }
        ],
    },
    skullcrusher_dumbbell: {
        transform: [
            { scale: 1.1 },
            { translateX: -78 },
            { translateY: -18 }
        ],
    },
    snatch_barbell: {
        transform: [
            { scale: 1 },
            { translateX: -80 },
            { translateY: -19 }
        ],
    },
    snatch_pull_barbell: {
        transform: [
            { scale: 1.2 },
            { translateX: -74 },
            { translateY: -17 }
        ],
    },
    squat: {
        transform: [
            { scale: 1 },
            { translateX: -79 },
            { translateY: -20 }
        ],
    },
    squat_band: {
        transform: [
            { scale: 1 },
            { translateX: -80.5 },
            { translateY: -20.5 }
        ],
    },
    squat_dumbbell: {
        transform: [
            { scale: 1 },
            { translateX: -75 },
            { translateY: -18 }
        ],
    },
    squat_machine: {
        transform: [
            { scale: 1 },
            { translateX: -80 },
            { translateY: -20 }
        ],
    },
    squat_smith_machine: {
        transform: [
            { scale: 0.9 },
            { translateX: -85 },
            { translateY: -25 }
        ],
    },
    stability_ball_crunch: {
        transform: [
            { scale: 1 },
            { translateX: -80 },
            { translateY: -22 }
        ],
    },
    standing_calf_raise_barbell: {
        transform: [
            { scale: 1 },
            { translateX: -82 },
            { translateY: -21 }
        ],
    },
    standing_calf_raise_machine: {
        transform: [
            { scale: 1.1 },
            { translateX: -78 },
            { translateY: -18 }
        ],
    },
    standing_face_pull_cable: {
        transform: [
            { scale: 1 },
            { translateX: -80 },
            { translateY: -19 }
        ],
    },
    standing_preacher_curl_dumbbell: {
        transform: [
            { scale: 1.2 },
            { translateX: -74 },
            { translateY: -17 }
        ],
    },
    standing_tricep_extention_dumbbell: {
        transform: [
            { scale: 1 },
            { translateX: -79 },
            { translateY: -20 }
        ],
    },
    stiff_leg_deadlift_band: {
        transform: [
            { scale: 1 },
            { translateX: -80.5 },
            { translateY: -20.5 }
        ],
    },
    stiff_leg_deadlift_barbell: {
        transform: [
            { scale: 1 },
            { translateX: -75 },
            { translateY: -18 }
        ],
    },
    stiff_leg_deadlift_dumbbell: {
        transform: [
            { scale: 1 },
            { translateX: -80 },
            { translateY: -20 }
        ],
    },
    sumo_deadlift_barbell: {
        transform: [
            { scale: 0.9 },
            { translateX: -85 },
            { translateY: -25 }
        ],
    },
    sumo_deadlift_high_pull: {
        transform: [
            { scale: 1 },
            { translateX: -80 },
            { translateY: -22 }
        ],
    },
    thruster_barbell: {
        transform: [
            { scale: 1 },
            { translateX: -82 },
            { translateY: -21 }
        ],
    },
    thruster_dumbbell: {
        transform: [
            { scale: 1.1 },
            { translateX: -78 },
            { translateY: -18 }
        ],
    },
    torso_rotation_machine: {
        transform: [
            { scale: 1 },
            { translateX: -80 },
            { translateY: -19 }
        ],
    },
    tricep_extension_machine: {
        transform: [
            { scale: 1.2 },
            { translateX: -74 },
            { translateY: -17 }
        ],
    },
    twist_cable: {
        transform: [
            { scale: 1 },
            { translateX: -79 },
            { translateY: -20 }
        ],
    },
    upright_row_barbell: {
        transform: [
            { scale: 1 },
            { translateX: -80.5 },
            { translateY: -20.5 }
        ],
    },
    upright_row_cable: {
        transform: [
            { scale: 1 },
            { translateX: -75 },
            { translateY: -18 }
        ],
    },
    upright_row_dumbbell: {
        transform: [
            { scale: 1 },
            { translateX: -80 },
            { translateY: -20 }
        ],
    },
    v_up: {
        transform: [
            { scale: 0.9 },
            { translateX: -85 },
            { translateY: -25 }
        ],
    },
    wide_bench_press_barbell: {
        transform: [
            { scale: 1 },
            { translateX: -80 },
            { translateY: -22 }
        ],
    },
    wide_pull_up: {
        transform: [
            { scale: 1 },
            { translateX: -82 },
            { translateY: -21 }
        ],
    },
    wrist_roller: {
        transform: [
            { scale: 1.1 },
            { translateX: -78 },
            { translateY: -18 }
        ],
    },
    zercher_squat_barbell: {
        transform: [
            { scale: 1 },
            { translateX: -80 },
            { translateY: -19 }
        ],
    },
});

export default ExerciseImagePreview;
