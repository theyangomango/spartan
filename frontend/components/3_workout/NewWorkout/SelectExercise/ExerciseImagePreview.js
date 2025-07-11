import React from 'react';
import { Image, StyleSheet, View } from 'react-native';

const ExerciseImagePreview = ({ exercise }) => {
    let source;
    let imageStyle = styles.defaultImage; // Default style if no specific style is defined

    switch (exercise) {
        case '45-Degree Leg Press (Machine)':
            source = require('../../../../assets/exercises/45-degree-leg-press-machine/final.png');
            imageStyle = styles._45_degree_leg_press_machine;
            break;
        case 'T-Bar Row (Machine)':
            source = require('../../../../assets/exercises/T-bar-row-machine/final.png');
            imageStyle = styles.t_bar_row_machine;
            break;
        case 'Ab Wheel Rollout':
            source = require('../../../../assets/exercises/ab-wheel-rollout/final.png');
            imageStyle = styles.ab_wheel_rollout;
            break;
        case 'Arnold Press (Dumbbell)':
            source = require('../../../../assets/exercises/arnold-press-dumbbell/final.png');
            imageStyle = styles.arnold_press_dumbbell;
            break;
        case 'Around the World (Dumbbell)':
            source = require('../../../../assets/exercises/around-the-world-dumbbell/final.png');
            imageStyle = styles.around_the_world_dumbbell;
            break;
        case 'Assisted Pull-Up (Band)':
            source = require('../../../../assets/exercises/assisted-pull-up-band/final.png');
            imageStyle = styles.assisted_pull_up_band;
            break;
        case 'Back Extension':
            source = require('../../../../assets/exercises/back-extension/final.png');
            imageStyle = styles.back_extension;
            break;
        case 'Back Extension (Machine)':
            source = require('../../../../assets/exercises/back-extension-machine/final.png');
            imageStyle = styles.back_extension_machine;
            break;
        case 'Back Squat (Barbell)':
            source = require('../../../../assets/exercises/back-squat-barbell/final.png');
            imageStyle = styles.back_squat_barbell;
            break;
        case 'Ball Slam':
            source = require('../../../../assets/exercises/ball-slam/final.png');
            imageStyle = styles.ball_slam;
            break;
        case 'Bench Dip':
            source = require('../../../../assets/exercises/bench-dip/final.png');
            imageStyle = styles.bench_dip;
            break;
        case 'Bench Press (Barbell)':
            source = require('../../../../assets/exercises/bench-press-barbell/final.png');
            imageStyle = styles.bench_press_barbell;
            break;
        case 'Bench Press (Cable)':
            source = require('../../../../assets/exercises/bench-press-cable/final.png');
            imageStyle = styles.bench_press_cable;
            break;
        case 'Bench Press (Dumbbell)':
            source = require('../../../../assets/exercises/bench-press-dumbbell/final.png');
            imageStyle = styles.bench_press_dumbbell;
            break;
        case 'Bench Press (Smith Machine)':
            source = require('../../../../assets/exercises/bench-press-smith-machine/final.png');
            imageStyle = styles.bench_press_smith_machine;
            break;
        case 'Bench Split Squat':
            source = require('../../../../assets/exercises/bench-split-squat/final.png');
            imageStyle = styles.bench_split_squat;
            break;
        case 'Bench Squat (Barbell)':
            source = require('../../../../assets/exercises/bench-squat-barbell/final.png');
            imageStyle = styles.bench_squat_barbell;
            break;
        case 'Bent-Over Row (Band)':
            source = require('../../../../assets/exercises/bent-over-row-band/final.png');
            imageStyle = styles.bent_over_row_band;
            break;
        case 'Bent-Over Row (Barbell)':
            source = require('../../../../assets/exercises/bent-over-row-barbell/final.png');
            imageStyle = styles.bent_over_row_barbell;
            break;
        case 'Bent-Over Row (Dumbbell)':
            source = require('../../../../assets/exercises/bent-over-row-dumbbell/final.png');
            imageStyle = styles.bent_over_row_dumbbell;
            break;
        case 'Bicep Curl (Barbell)':
            source = require('../../../../assets/exercises/bicep-curl-barbell/final.png');
            imageStyle = styles.bicep_curl_barbell;
            break;
        case 'Bicep Curl (Dumbbell)':
            source = require('../../../../assets/exercises/bicep-curl-dumbbell/final.png');
            imageStyle = styles.bicep_curl_dumbbell;
            break;
        case 'Bicep Curl (Machine)':
            source = require('../../../../assets/exercises/bicep-curl-machine/final.png');
            imageStyle = styles.bicep_curl_machine;
            break;
        case 'Biceps Curl (Cable)':
            source = require('../../../../assets/exercises/biceps-curl-cable/final.png');
            imageStyle = styles.biceps_curl_cable;
            break;
        case 'Bicycle Crunch':
            source = require('../../../../assets/exercises/bicycle-crunch/final.png');
            imageStyle = styles.bicycle_crunch;
            break;
        case 'Box Jump':
            source = require('../../../../assets/exercises/box-jump/final.png');
            imageStyle = styles.box_jump;
            break;
        case 'Burpee':
            source = require('../../../../assets/exercises/burpee/final.png');
            imageStyle = styles.burpee;
            break;
        case 'Calf Raise (Dumbbell)':
            source = require('../../../../assets/exercises/calf-raise-dumbbell/final.png');
            imageStyle = styles.calf_raise_dumbbell;
            break;
        case 'Calf Raise on 45-Degree Leg Press (Machine)':
            source = require('../../../../assets/exercises/calf-raise-on-45-degree-leg-press-machine/final.png');
            imageStyle = styles.calf_raise_on_45_degree_leg_press_machine;
            break;
        case 'Calf Raise on Leg Press (Machine)':
            source = require('../../../../assets/exercises/calf-raise-on-leg-press-machine/final.png');
            imageStyle = styles.calf_raise_on_leg_press_machine;
            break;
        case 'Calf Raise (Smith Machine)':
            source = require('../../../../assets/exercises/calf-raise-smith-machine/final.png');
            imageStyle = styles.calf_raise_smith_machine;
            break;
        case 'Chest Dip':
            source = require('../../../../assets/exercises/chest-dip/final.png');
            imageStyle = styles.chest_dip;
            break;
        case 'Chest Dip (Assisted)':
            source = require('../../../../assets/exercises/chest-dip-assisted/final.png');
            imageStyle = styles.chest_dip_assisted;
            break;
        case 'Chest Fly (Cable)':
            source = require('../../../../assets/exercises/chest-fly-cable/final.png');
            imageStyle = styles.chest_fly_cable;
            break;
        case 'Chest Fly (Dumbbell)':
            source = require('../../../../assets/exercises/chest-fly-dumbbell/final.png');
            imageStyle = styles.chest_fly_dumbbell;
            break;
        case 'Chest Fly (Machine)':
            source = require('../../../../assets/exercises/chest-fly-machine/final.png');
            imageStyle = styles.chest_fly_machine;
            break;
        case 'Chest Press (Machine)':
            source = require('../../../../assets/exercises/chest-press-machine/final.png');
            imageStyle = styles.chest_press_machine;
            break;
        case 'Chin-Up':
            source = require('../../../../assets/exercises/chin-up/final.png');
            imageStyle = styles.chin_up;
            break;
        case 'Chin-Up (Assisted)':
            source = require('../../../../assets/exercises/chin-up-assisted/final.png');
            imageStyle = styles.chin_up_assisted;
            break;
        case 'Clean and Jerk (Barbell)':
            source = require('../../../../assets/exercises/clean-and-jerk-barbell/final.png');
            imageStyle = styles.clean_and_jerk_barbell;
            break;
        case 'Clean High Pull (Barbell)':
            source = require('../../../../assets/exercises/clean-high-pull-barbell/final.png');
            imageStyle = styles.clean_high_pull_barbell;
            break;
        case 'Close-Grip Bench Press (Barbell)':
            source = require('../../../../assets/exercises/close-grip-bench-press-barbell/final.png');
            imageStyle = styles.close_grip_bench_press_barbell;
            break;
        case 'Concentration Curl (Dumbbell)':
            source = require('../../../../assets/exercises/concentration-curl-dumbbell/final.png');
            imageStyle = styles.concentration_curl_dumbbell;
            break;
        case 'Cross-Body Crunch':
            source = require('../../../../assets/exercises/cross-body-crunch/final.png');
            imageStyle = styles.cross_body_crunch;
            break;
        case 'Crunch':
            source = require('../../../../assets/exercises/crunch/final.png');
            imageStyle = styles.crunch;
            break;
        case 'Crunch (Cable)':
            source = require('../../../../assets/exercises/crunch-cable/final.png');
            imageStyle = styles.crunch_cable;
            break;
        case 'Deadlift (Band)':
            source = require('../../../../assets/exercises/deadlift-band/final.png');
            imageStyle = styles.deadlift_band;
            break;
        case 'Deadlift (Barbell)':
            source = require('../../../../assets/exercises/deadlift-barbell/final.png');
            imageStyle = styles.deadlift_barbell;
            break;
        case 'Deadlift (Dumbbell)':
            source = require('../../../../assets/exercises/deadlift-dumbbell/final.png');
            imageStyle = styles.deadlift_dumbbell;
            break;
        case 'Deadlift from Deficit (Barbell)':
            source = require('../../../../assets/exercises/deadlift-from-deficit-barbell/final.png');
            imageStyle = styles.deadlift_from_deficit_barbell;
            break;
        case 'Deadlift (Smith Machine)':
            source = require('../../../../assets/exercises/deadlift-smith-machine/final.png');
            imageStyle = styles.deadlift_smith_machine;
            break;
        case 'Deadlift (Trap Bar)':
            source = require('../../../../assets/exercises/deadlift-trap-bar/final.png');
            imageStyle = styles.deadlift_trap_bar;
            break;
        case 'Decline Bench Press (Barbell)':
            source = require('../../../../assets/exercises/decline-bench-press-barbell/final.png');
            imageStyle = styles.decline_bench_press_barbell;
            break;
        case 'Decline Bench Press (Dumbbell)':
            source = require('../../../../assets/exercises/decline-bench-press-dumbbell/final.png');
            imageStyle = styles.decline_bench_press_dumbbell;
            break;
        case 'Decline Bench (Smith Machine)':
            source = require('../../../../assets/exercises/decline-bench-smith-machine/final.png');
            imageStyle = styles.decline_bench_smith_machine;
            break;
        case 'Decline Crunch':
            source = require('../../../../assets/exercises/decline-crunch/final.png');
            imageStyle = styles.decline_crunch;
            break;
        case 'Decline Sit-Up':
            source = require('../../../../assets/exercises/decline-sit-up/final.png');
            imageStyle = styles.decline_sit_up;
            break;
        case 'Floor Press (Barbell)':
            source = require('../../../../assets/exercises/floor-press-barbell/final.png');
            imageStyle = styles.floor_press_barbell;
            break;
        case 'Front Raise':
            source = require('../../../../assets/exercises/front-raise/final.png');
            imageStyle = styles.front_raise;
            break;
        case 'Front Raise (Band)':
            source = require('../../../../assets/exercises/front-raise-band/final.png');
            imageStyle = styles.front_raise_band;
            break;
        case 'Front Raise (Barbell)':
            source = require('../../../../assets/exercises/front-raise-barbell/final.png');
            imageStyle = styles.front_raise_barbell;
            break;
        case 'Front Raise (Cable)':
            source = require('../../../../assets/exercises/front-raise-cable/final.png');
            imageStyle = styles.front_raise_cable;
            break;
        case 'Front Raise (Dumbbell)':
            source = require('../../../../assets/exercises/front-raise-dumbbell/final.png');
            imageStyle = styles.front_raise_dumbbell;
            break;
        case 'Glute-Ham Raise':
            source = require('../../../../assets/exercises/glute-ham-raise/final.png');
            imageStyle = styles.glute_ham_raise;
            break;
        case 'Glute Kickback (Machine)':
            source = require('../../../../assets/exercises/glute-kickback-machine/final.png');
            imageStyle = styles.glute_kickback_machine;
            break;
        case 'Goblet Squat (Dumbbell)':
            source = require('../../../../assets/exercises/goblet-squat-dumbbell/final.png');
            imageStyle = styles.goblet_squat_dumbbell;
            break;
        case 'Good Morning (Barbell)':
            source = require('../../../../assets/exercises/good-morning-barbell/final.png');
            imageStyle = styles.good_morning_barbell;
            break;
        case 'Hack Squat (Sled Machine)':
            source = require('../../../../assets/exercises/hack-squat-sled-machine/final.png');
            imageStyle = styles.hack_squat_sled_machine;
            break;
        case 'Hammer Curl (Band)':
            source = require('../../../../assets/exercises/hammer-curl-band/final.png');
            imageStyle = styles.hammer_curl_band;
            break;
        case 'Hammer Curl (Cable)':
            source = require('../../../../assets/exercises/hammer-curl-cable/final.png');
            imageStyle = styles.hammer_curl_cable;
            break;
        case 'Hammer Curl (Dumbbell)':
            source = require('../../../../assets/exercises/hammer-curl-dumbbell/final.png');
            imageStyle = styles.hammer_curl_dumbbell;
            break;
        case 'Handstand Push-Up':
            source = require('../../../../assets/exercises/handstand-push-up/final.png');
            imageStyle = styles.handstand_push_up;
            break;
        case 'Hang Clean (Barbell)':
            source = require('../../../../assets/exercises/hang-clean-barbell/final.png');
            imageStyle = styles.hang_clean_barbell;
            break;
        case 'Hang Snatch (Barbell)':
            source = require('../../../../assets/exercises/hang-snatch-barbell/final.png');
            imageStyle = styles.hang_snatch_barbell;
            break;
        case 'Hanging Knees to Elbows':
            source = require('../../../../assets/exercises/hanging-knees-to-elbows/final.png');
            imageStyle = styles.hanging_knees_to_elbows;
            break;
        case 'Hanging Leg Raise':
            source = require('../../../../assets/exercises/hanging-leg-raise/final.png');
            imageStyle = styles.hanging_leg_raise;
            break;
        case 'Hanging Toes to Bar':
            source = require('../../../../assets/exercises/hanging-toes-to-bar/final.png');
            imageStyle = styles.hanging_toes_to_bar;
            break;
        case 'Hip Adduction (Machine)':
            source = require('../../../../assets/exercises/hip-adduction-machine/final.png');
            imageStyle = styles.hip_adduction_machine;
            break;
        case 'Hip Thrust (Barbell)':
            source = require('../../../../assets/exercises/hip-thrust-barbell/final.png');
            imageStyle = styles.hip_thrust_barbell;
            break;
        case 'Incline Bench (Barbell)':
            source = require('../../../../assets/exercises/incline-bench-barbell/final.png');
            imageStyle = styles.incline_bench_barbell;
            break;
        case 'Incline Bench Press (Cable)':
            source = require('../../../../assets/exercises/incline-bench-press-cable/final.png');
            imageStyle = styles.incline_bench_press_cable;
            break;
        case 'Incline Bench Press (Dumbbell)':
            source = require('../../../../assets/exercises/incline-bench-press-dumbbell/final.png');
            imageStyle = styles.incline_bench_press_dumbbell;
            break;
        case 'Incline Bench (Smith Machine)':
            source = require('../../../../assets/exercises/incline-bench-smith-machine/final.png');
            imageStyle = styles.incline_bench_smith_machine;
            break;
        case 'Incline Bicep Curl (Dumbbell)':
            source = require('../../../../assets/exercises/incline-bicep-curl-dumbbell/final.png');
            imageStyle = styles.incline_bicep_curl_dumbbell;
            break;
        case 'Incline Chest Press (Machine)':
            source = require('../../../../assets/exercises/incline-chess-press-machine/final.png');
            imageStyle = styles.incline_chess_press_machine;
            break;
        case 'Incline Fly (Dumbbell)':
            source = require('../../../../assets/exercises/incline-fly-dumbbell/final.png');
            imageStyle = styles.incline_fly_dumbbell;
            break;
        case 'Incline Row (Barbell)':
            source = require('../../../../assets/exercises/incline-row-barbell/final.png');
            imageStyle = styles.incline_row_barbell;
            break;
        case 'Incline Row (Dumbbell)':
            source = require('../../../../assets/exercises/incline-row-dumbbell/final.png');
            imageStyle = styles.incline_row_dumbbell;
            break;
        case 'Inverted Row':
            source = require('../../../../assets/exercises/inverted-row/final.png');
            imageStyle = styles.inverted_row;
            break;
        case 'Jerk (Barbell)':
            source = require('../../../../assets/exercises/jerk-barbell/final.png');
            imageStyle = styles.jerk_barbell;
            break;
        case 'Jump Shrug (Barbell)':
            source = require('../../../../assets/exercises/jump-shrug-barbell/final.png');
            imageStyle = styles.jump_shrug_barbell;
            break;
        case 'Jump Squat':
            source = require('../../../../assets/exercises/jump-squat/final.png');
            imageStyle = styles.jump_squat;
            break;
        case 'Kettlebell Swing':
            source = require('../../../../assets/exercises/kettlebell-swing/final.png');
            imageStyle = styles.kettlebell_swing;
            break;
        case 'Kettlebell Turkish Get-Up':
            source = require('../../../../assets/exercises/kettlebell-turkish-get-up/final.png');
            imageStyle = styles.kettlebell_turkish_get_up;
            break;
        case 'Knee Push-Up':
            source = require('../../../../assets/exercises/knee-push-up/final.png');
            imageStyle = styles.knee_push_up;
            break;
        case 'Lat Pulldown (Cable)':
            source = require('../../../../assets/exercises/lat-pulldown-cable/final.png');
            imageStyle = styles.lat_pulldown_cable;
            break;
        case 'Lat Pulldown (Machine)':
            source = require('../../../../assets/exercises/lat-pulldown-machine/final.png');
            imageStyle = styles.lat_pulldown_machine;
            break;
        case 'Lateral Raise (Band)':
            source = require('../../../../assets/exercises/lateral-raise-band/final.png');
            imageStyle = styles.lateral_raise_band;
            break;
        case 'Lateral Raise (Cable)':
            source = require('../../../../assets/exercises/lateral-raise-cable/final.png');
            imageStyle = styles.lateral_raise_cable;
            break;
        case 'Lateral Raise (Dumbbell)':
            source = require('../../../../assets/exercises/lateral-raise-dumbbell/final.png');
            imageStyle = styles.lateral_raise_dumbbell;
            break;
        case 'Lateral Raise (Machine)':
            source = require('../../../../assets/exercises/lateral-raise-machine/final.png');
            imageStyle = styles.lateral_raise_machine;
            break;
        case 'Leg Curl (Machine)':
            source = require('../../../../assets/exercises/leg-curl-machine/final.png');
            imageStyle = styles.leg_curl_machine;
            break;
        case 'Leg Extension (Machine)':
            source = require('../../../../assets/exercises/leg-extension-machine/final.png');
            imageStyle = styles.leg_extension_machine;
            break;
        case 'Leg Press (Machine)':
            source = require('../../../../assets/exercises/leg-press-machine/final.png');
            imageStyle = styles.leg_press_machine;
            break;
        case 'Leg Raise':
            source = require('../../../../assets/exercises/leg-raise/final.png');
            imageStyle = styles.leg_raise;
            break;
        case 'Leg Raise (Captain\'s Chair)':
            source = require('../../../../assets/exercises/leg-raise-captains-chair/final.png');
            imageStyle = styles.leg_raise_captains_chair;
            break;
        case 'Lunge':
            source = require('../../../../assets/exercises/lunge/final.png');
            imageStyle = styles.lunge;
            break;
        case 'Lunge (Barbell)':
            source = require('../../../../assets/exercises/lunge-barbell/final.png');
            imageStyle = styles.lunge_barbell;
            break;
        case 'Lunge (Dumbbell)':
            source = require('../../../../assets/exercises/lunge-dumbbell/final.png');
            imageStyle = styles.lunge_dumbbell;
            break;
        case 'Lying Knee Raise':
            source = require('../../../../assets/exercises/lying-knee-raise/final.png');
            imageStyle = styles.lying_knee_raise;
            break;
        case 'Lying Leg Curl (Machine)':
            source = require('../../../../assets/exercises/lying-leg-curl-machine/final.png');
            imageStyle = styles.lying_leg_curl_machine;
            break;
        case 'Muscle-Up':
            source = require('../../../../assets/exercises/muscle-up/final.png');
            imageStyle = styles.muscle_up;
            break;
        case 'Oblique Crunch':
            source = require('../../../../assets/exercises/oblique-crunch/final.png');
            imageStyle = styles.oblique_crunch;
            break;
        case 'One-Arm Curl (Cable)':
            source = require('../../../../assets/exercises/one-arm-curl-cable/final.png');
            imageStyle = styles.one_arm_curl_cable;
            break;
        case 'Overhead Squat (Barbell)':
            source = require('../../../../assets/exercises/overhead-squat-barbell/final.png');
            imageStyle = styles.overhead_squat_barbell;
            break;
        case 'Overhead Tricep Extension (Barbell)':
            source = require('../../../../assets/exercises/overhead-tricep-extension-barbell/final.png');
            imageStyle = styles.overhead_tricep_extension_barbell;
            break;
        case 'Overhead Tricep Extension (Cable)':
            source = require('../../../../assets/exercises/overhead-tricep-extension-cable/final.png');
            imageStyle = styles.overhead_tricep_extension_cable;
            break;
        case 'Pec Deck (Machine)':
            source = require('../../../../assets/exercises/pec-deck-machine/final.png');
            imageStyle = styles.pec_deck_machine;
            break;
        case 'Pendlay Row (Barbell)':
            source = require('../../../../assets/exercises/pendlay-row-barbell/final.png');
            imageStyle = styles.pendlay_row_barbell;
            break;
        case 'Pistol Squat':
            source = require('../../../../assets/exercises/pistol-squat/final.png');
            imageStyle = styles.pistol_squat;
            break;
        case 'Plank':
            source = require('../../../../assets/exercises/plank/medium.png');
            imageStyle = styles.plank;
            break;
        case 'Power Clean':
            source = require('../../../../assets/exercises/power-clean/final.png');
            imageStyle = styles.power_clean;
            break;
        case 'Preacher Curl (Barbell)':
            source = require('../../../../assets/exercises/preacher-curl-barbell/final.png');
            imageStyle = styles.preacher_curl_barbell;
            break;
        case 'Preacher Curl (Dumbbell)':
            source = require('../../../../assets/exercises/preacher-curl-dumbbell/final.png');
            imageStyle = styles.preacher_curl_dumbbell;
            break;
        case 'Preacher Curl (Machine)':
            source = require('../../../../assets/exercises/preacher-curl-machine/final.png');
            imageStyle = styles.preacher_curl_machine;
            break;
        case 'Press Under (Barbell)':
            source = require('../../../../assets/exercises/press-under-barbell/final.png');
            imageStyle = styles.press_under_barbell;
            break;
        case 'Pull-Through (Cable)':
            source = require('../../../../assets/exercises/pull-through-cable/final.png');
            imageStyle = styles.pull_through_cable;
            break;
        case 'Pull-Up':
            source = require('../../../../assets/exercises/pull-up/final.png');
            imageStyle = styles.pull_up;
            break;
        case 'Pull-Up (Assisted)':
            source = require('../../../../assets/exercises/pull-up-assisted/final.png');
            imageStyle = styles.pull_up_assisted;
            break;
        case 'Pullover (Dumbbell)':
            source = require('../../../../assets/exercises/pullover-dumbell/final.png');
            imageStyle = styles.pullover_dumbell;
            break;
        case 'Pullover (Machine)':
            source = require('../../../../assets/exercises/pullover-machine/final.png');
            imageStyle = styles.pullover_machine;
            break;
        case 'Push-Up':
            source = require('../../../../assets/exercises/push-up/final.png');
            imageStyle = styles.push_up;
            break;
        case 'Push-Up (Band)':
            source = require('../../../../assets/exercises/push-up-band/final.png');
            imageStyle = styles.push_up_band;
            break;
        case 'Pushdown (Cable)':
            source = require('../../../../assets/exercises/pushdown-cable/final.png');
            imageStyle = styles.pushdown_cable;
            break;
        case 'Rack Pull (Barbell)':
            source = require('../../../../assets/exercises/rack-pull-barbell/final.png');
            imageStyle = styles.rack_pull_barbell;
            break;
        case 'Raise (Dumbbell)':
            source = require('../../../../assets/exercises/raise-dumbbell/final.png');
            imageStyle = styles.raise_dumbbell;
            break;
        case 'Rear Fly (Dumbbell)':
            source = require('../../../../assets/exercises/rear-fly-dumbbell/final.png');
            imageStyle = styles.rear_fly_dumbbell;
            break;
        case 'Reverse Concentration Curl (Dumbbell)':
            source = require('../../../../assets/exercises/reverse-concentration-curl-dumbbell/final.png');
            imageStyle = styles.reverse_concentration_curl_dumbbell;
            break;
        case 'Reverse Crunch':
            source = require('../../../../assets/exercises/reverse-crunch/final.png');
            imageStyle = styles.reverse_crunch;
            break;
        case 'Reverse Curl (Barbell)':
            source = require('../../../../assets/exercises/reverse-curl-barbell/final.png');
            imageStyle = styles.reverse_curl_barbell;
            break;
        case 'Reverse Curl (Dumbbell)':
            source = require('../../../../assets/exercises/reverse-curl-dumbbell/final.png');
            imageStyle = styles.reverse_curl_dumbbell;
            break;
        case 'Reverse Fly (Cable)':
            source = require('../../../../assets/exercises/reverse-fly-cable/final.png');
            imageStyle = styles.reverse_fly_cable;
            break;
        case 'Reverse Fly (Dumbbell)':
            source = require('../../../../assets/exercises/reverse-fly-dumbbell/final.png');
            imageStyle = styles.reverse_fly_dumbbell;
            break;
        case 'Reverse Fly (Machine)':
            source = require('../../../../assets/exercises/reverse-fly-machine/final.png');
            imageStyle = styles.reverse_fly_machine;
            break;
        case 'Reverse Grip Bent-Over Row (Barbell)':
            source = require('../../../../assets/exercises/reverse-grip-bent-over-row-barbell/final.png');
            imageStyle = styles.reverse_grip_bent_over_row_barbell;
            break;
        case 'Reverse Plank':
            source = require('../../../../assets/exercises/reverse-plank/final.png');
            imageStyle = styles.reverse_plank;
            break;
        case 'Reverse Preacher Curl (Barbell)':
            source = require('../../../../assets/exercises/reverse-preacher-curl-barbell/final.png');
            imageStyle = styles.reverse_preacher_curl_barbell;
            break;
        case 'Reverse Preacher Curl (Dumbbell)':
            source = require('../../../../assets/exercises/reverse-preacher-curl-dumbbell/final.png');
            imageStyle = styles.reverse_preacher_curl_dumbbell;
            break;
        case 'Reverse Wrist Curl (Dumbbell)':
            source = require('../../../../assets/exercises/reverse-wrist-curl-dumbbell/final.png');
            imageStyle = styles.reverse_wrist_curl_dumbbell;
            break;
        case 'Romanian Deadlift (Dumbbell)':
            source = require('../../../../assets/exercises/romanian-deadlift-dumbbell/final.png');
            imageStyle = styles.romanian_deadlift_dumbbell;
            break;
        case 'Russian Twist':
            source = require('../../../../assets/exercises/russian-twist/final.png');
            imageStyle = styles.russian_twist;
            break;
        case 'Seated Calf Press (Machine)':
            source = require('../../../../assets/exercises/seated-calf-press-machine/final.png');
            imageStyle = styles.seated_calf_press_machine;
            break;
        case 'Seated Calf Raise (Machine)':
            source = require('../../../../assets/exercises/seated-calf-raise-machine/final.png');
            imageStyle = styles.seated_calf_raise_machine;
            break;
        case 'Seated Crunch (Machine)':
            source = require('../../../../assets/exercises/seated-crunch-machine/final.png');
            imageStyle = styles.seated_crunch_machine;
            break;
        case 'Seated Row (Cable)':
            source = require('../../../../assets/exercises/seated-row-cable/final.png');
            imageStyle = styles.seated_row_cable;
            break;
        case 'Seated Row (Machine)':
            source = require('../../../../assets/exercises/seated-row-machine/final.png');
            imageStyle = styles.seated_row_machine;
            break;
        case 'Seated Shoulder Press (Barbell)':
            source = require('../../../../assets/exercises/seated-shoulder-press-barbell/final.png');
            imageStyle = styles.seated_shoulder_press_barbell;
            break;
        case 'Seated Single Leg Press (Machine)':
            source = require('../../../../assets/exercises/seated-single-leg-press-machine/final.png');
            imageStyle = styles.seated_single_leg_press_machine;
            break;
        case 'Seated Wrist Curl (Dumbbell)':
            source = require('../../../../assets/exercises/seated-wrist-curl-dumbbell/final.png');
            imageStyle = styles.seated_wrist_curl_dumbbell;
            break;
        case 'Shoulder Press (Barbell)':
            source = require('../../../../assets/exercises/shoulder-press-barbell/final.png');
            imageStyle = styles.shoulder_press_barbell;
            break;
        case 'Shoulder Press (Cable)':
            source = require('../../../../assets/exercises/shoulder-press-cable/final.png');
            imageStyle = styles.shoulder_press_cable;
            break;
        case 'Shoulder Press (Dumbbell)':
            source = require('../../../../assets/exercises/shoulder-press-dumbbell/final.png');
            imageStyle = styles.shoulder_press_dumbbell;
            break;
        case 'Shoulder Press (Machine)':
            source = require('../../../../assets/exercises/shoulder-press-machine/final.png');
            imageStyle = styles.shoulder_press_machine;
            break;
        case 'Shoulder Press (Smith Machine)':
            source = require('../../../../assets/exercises/shoulder-press-smith-machine/final.png');
            imageStyle = styles.shoulder_press_smith_machine;
            break;
        case 'Shrug (Barbell)':
            source = require('../../../../assets/exercises/shrug-barbell/final.png');
            imageStyle = styles.shrug_barbell;
            break;
        case 'Shrug (Dumbbell)':
            source = require('../../../../assets/exercises/shrug-dumbbell/final.png');
            imageStyle = styles.shrug_dumbbell;
            break;
        case 'Shrug (Machine)':
            source = require('../../../../assets/exercises/shrug-machine/final.png');
            imageStyle = styles.shrug_machine;
            break;
        case 'Shrug (Smith Machine)':
            source = require('../../../../assets/exercises/shrug-smith-machine/final.png');
            imageStyle = styles.shrug_smith_machine;
            break;
        case 'Side Bend (Cable)':
            source = require('../../../../assets/exercises/side-bend-cable/final.png');
            imageStyle = styles.side_bend_cable;
            break;
        case 'Side Bend (Dumbbell)':
            source = require('../../../../assets/exercises/side-bend-dumbbell/final.png');
            imageStyle = styles.side_bend_dumbbell;
            break;
        case 'Side Plank':
            source = require('../../../../assets/exercises/side-plank/final.png');
            imageStyle = styles.side_plank;
            break;
        case 'Single Arm Lat Pulldown (Cable)':
            source = require('../../../../assets/exercises/single-arm-lat-pulldown-cable/final.png');
            imageStyle = styles.single_arm_lat_pulldown_cable;
            break;
        case 'Single Arm Tricep Extension (Cable)':
            source = require('../../../../assets/exercises/single-arm-tricep-extension-cable/final.png');
            imageStyle = styles.single_arm_tricep_extension_cable;
            break;
        case 'Sit-Up':
            source = require('../../../../assets/exercises/sit-up/final.png');
            imageStyle = styles.sit_up;
            break;
        case 'Skullcrusher (Barbell)':
            source = require('../../../../assets/exercises/skullcrusher-barbell/final.png');
            imageStyle = styles.skullcrusher_barbell;
            break;
        case 'Skullcrusher (Dumbbell)':
            source = require('../../../../assets/exercises/skullcrusher-dumbbell/final.png');
            imageStyle = styles.skullcrusher_dumbbell;
            break;
        case 'Snatch (Barbell)':
            source = require('../../../../assets/exercises/snatch-barbell/final.png');
            imageStyle = styles.snatch_barbell;
            break;
        case 'Snatch Pull (Barbell)':
            source = require('../../../../assets/exercises/snatch-pull-barbell/final.png');
            imageStyle = styles.snatch_pull_barbell;
            break;
        case 'Squat':
            source = require('../../../../assets/exercises/squat/final.png');
            imageStyle = styles.squat;
            break;
        case 'Squat (Band)':
            source = require('../../../../assets/exercises/squat-band/final.png');
            imageStyle = styles.squat_band;
            break;
        case 'Squat (Dumbbell)':
            source = require('../../../../assets/exercises/squat-dumbbell/final.png');
            imageStyle = styles.squat_dumbbell;
            break;
        case 'Squat (Machine)':
            source = require('../../../../assets/exercises/squat-machine/final.png');
            imageStyle = styles.squat_machine;
            break;
        case 'Squat (Smith Machine)':
            source = require('../../../../assets/exercises/squat-smith-machine/final.png');
            imageStyle = styles.squat_smith_machine;
            break;
        case 'Stability Ball Crunch':
            source = require('../../../../assets/exercises/stability-ball-crunch/final.png');
            imageStyle = styles.stability_ball_crunch;
            break;
        case 'Standing Calf Raise (Barbell)':
            source = require('../../../../assets/exercises/standing-calf-raise-barbell/final.png');
            imageStyle = styles.standing_calf_raise_barbell;
            break;
        case 'Standing Calf Raise (Machine)':
            source = require('../../../../assets/exercises/standing-calf-raise-machine/final.png');
            imageStyle = styles.standing_calf_raise_machine;
            break;
        case 'Standing Face Pull (Cable)':
            source = require('../../../../assets/exercises/standing-face-pull-cable/final.png');
            imageStyle = styles.standing_face_pull_cable;
            break;
        case 'Standing Preacher Curl (Dumbbell)':
            source = require('../../../../assets/exercises/standing-preacher-curl-dumbbell/final.png');
            imageStyle = styles.standing_preacher_curl_dumbbell;
            break;
        case 'Standing Tricep Extension (Dumbbell)':
            source = require('../../../../assets/exercises/standing-tricep-extention-dumbbell/final.png');
            imageStyle = styles.standing_tricep_extention_dumbbell;
            break;
        case 'Stiff-Leg Deadlift (Band)':
            source = require('../../../../assets/exercises/stiff-leg-deadlift-band/final.png');
            imageStyle = styles.stiff_leg_deadlift_band;
            break;
        case 'Stiff-Leg Deadlift (Barbell)':
            source = require('../../../../assets/exercises/stiff-leg-deadlift-barbell/final.png');
            imageStyle = styles.stiff_leg_deadlift_barbell;
            break;
        case 'Stiff-Leg Deadlift (Dumbbell)':
            source = require('../../../../assets/exercises/stiff-leg-deadlift-dumbbell/final.png');
            imageStyle = styles.stiff_leg_deadlift_dumbbell;
            break;
        case 'Sumo Deadlift (Barbell)':
            source = require('../../../../assets/exercises/sumo-deadlift-barbell/final.png');
            imageStyle = styles.sumo_deadlift_barbell;
            break;
        case 'Sumo Deadlift High Pull':
            source = require('../../../../assets/exercises/sumo-deadlift-high-pull/final.png');
            imageStyle = styles.sumo_deadlift_high_pull;
            break;
        case 'Thruster (Barbell)':
            source = require('../../../../assets/exercises/thruster-barbell/final.png');
            imageStyle = styles.thruster_barbell;
            break;
        case 'Thruster (Dumbbell)':
            source = require('../../../../assets/exercises/thruster-dumbbell/final.png');
            imageStyle = styles.thruster_dumbbell;
            break;
        case 'Torso Rotation (Machine)':
            source = require('../../../../assets/exercises/torso-rotation-machine/final.png');
            imageStyle = styles.torso_rotation_machine;
            break;
        case 'Tricep Extension (Machine)':
            source = require('../../../../assets/exercises/tricep-extension-machine/final.png');
            imageStyle = styles.tricep_extension_machine;
            break;
        case 'Twist (Cable)':
            source = require('../../../../assets/exercises/twist-cable/final.png');
            imageStyle = styles.twist_cable;
            break;
        case 'Upright Row (Barbell)':
            source = require('../../../../assets/exercises/upright-row-barbell/final.png');
            imageStyle = styles.upright_row_barbell;
            break;
        case 'Upright Row (Cable)':
            source = require('../../../../assets/exercises/upright-row-cable/final.png');
            imageStyle = styles.upright_row_cable;
            break;
        case 'Upright Row (Dumbbell)':
            source = require('../../../../assets/exercises/upright-row-dumbbell/final.png');
            imageStyle = styles.upright_row_dumbbell;
            break;
        case 'V-Up':
            source = require('../../../../assets/exercises/v-up/final.png');
            imageStyle = styles.v_up;
            break;
        case 'Wide Bench Press (Barbell)':
            source = require('../../../../assets/exercises/wide-bench-press-barbell/final.png');
            imageStyle = styles.wide_bench_press_barbell;
            break;
        case 'Wide Pull-Up':
            source = require('../../../../assets/exercises/wide-pull-up/final.png');
            imageStyle = styles.wide_pull_up;
            break;
        case 'Wrist Roller':
            source = require('../../../../assets/exercises/wrist-roller/final.png');
            imageStyle = styles.wrist_roller;
            break;
        case 'Zercher Squat (Barbell)':
            source = require('../../../../assets/exercises/zercher-squat-barbell/final.png');
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
        // width: 135,
        // height: 135,
        width: 55,
        height: 55,
        resizeMode: 'contain'
    },
    defaultImage: {
        transform: [
            { scale: 1 },
            { translateX: -80.5 },
            { translateY: -20.5 }
        ],
    },
});

export default ExerciseImagePreview;
