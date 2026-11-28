import { foundationApplied } from "./foundation";
import { intermediateApplied } from "./intermediate";
import { advancedApplied } from "./advanced";
import { appliedScience } from "./science";

export const appliedDefinitions = {
  ...foundationApplied,
  ...intermediateApplied,
  ...advancedApplied,
  ...appliedScience,
};

const unity = {
  title: "Unity Manual · Order of Execution",
  url: "https://docs.unity3d.com/Manual/execution-order.html",
};
const arduino = {
  title: "Arduino · Language Reference",
  url: "https://docs.arduino.cc/language-reference/",
};
const google = {
  title: "Google for Developers · Apps Script best practices",
  url: "https://developers.google.com/apps-script/guides/support/best-practices",
};
const graphics = {
  title: "Khronos · OpenGL Rendering Pipeline",
  url: "https://wikis.khronos.org/opengl/Rendering_Pipeline_Overview",
};
const robot = {
  title: "Modern Robotics · Wheeled Mobile Robots",
  url: "https://modernrobotics.northwestern.edu/chapters/chapter13/",
};
const signal = {
  title: "MIT OCW · Signals and Systems",
  url: "https://ocw.mit.edu/courses/res-6-007-signals-and-systems-spring-2011/",
};
const transport = {
  title: "Gaffer on Games · Snapshot Interpolation",
  url: "https://gafferongames.com/post/snapshot_interpolation/",
};

export const appliedSources: Record<string, { title: string; url: string }> = {
  "game-loop": unity,
  "game-state": unity,
  "game-movement": {
    title: "Godot · Vector math",
    url: "https://docs.godotengine.org/en/stable/tutorials/math/vector_math.html",
  },
  "game-collision": {
    title: "MDN · 2D collision detection",
    url: "https://developer.mozilla.org/en-US/docs/Games/Techniques/2D_collision_detection",
  },
  "game-behavior": {
    title: "BehaviorTree.CPP · Behavior Trees",
    url: "https://www.behaviortree.dev/docs/learn-the-basics/BT_basics/",
  },
  "game-network": transport,
  "graphics-projection": graphics,
  "graphics-material": {
    title: "Physically Based Rendering · Reflection Models",
    url: "https://pbr-book.org/4ed/Reflection_Models",
  },
  "physics-fall": {
    title: "Baraff · An Introduction to Physically Based Modeling",
    url: "https://www.cs.cmu.edu/~baraff/sigcourse/",
  },
  "procedural-terrain": {
    title: "Perlin · Improving Noise",
    url: "https://dl.acm.org/doi/10.1145/566654.566636",
  },
  "arduino-board": arduino,
  "sensor-calibration": {
    title: "NIST · Engineering Statistics Handbook · Calibration",
    url: "https://www.itl.nist.gov/div898/handbook/mpc/section3/mpc3.htm",
  },
  "collision-3d": {
    title: "MDN · 3D collision detection",
    url: "https://developer.mozilla.org/en-US/docs/Games/Techniques/3D_collision_detection",
  },
  "closed-loop": {
    title: "Åström & Murray · Feedback Systems",
    url: "https://fbsbook.org/",
  },
  "embedded-queue": {
    title: "FreeRTOS · Inter-task communication",
    url: "https://www.freertos.org/Documentation/02-Kernel/02-Kernel-features/02-Queues-mutexes-and-semaphores/01-Queues",
  },
  "signal-sampling": signal,
  "robot-control": {
    title: "Åström & Murray · Feedback Systems",
    url: "https://fbsbook.org/",
  },
  "robot-pose": robot,
  "robot-filter": {
    title: "Welch & Bishop · An Introduction to the Kalman Filter",
    url: "https://www.cs.unc.edu/~welch/media/pdf/kalman_intro.pdf",
  },
  "robot-particles": {
    title: "Labbe · Kalman and Bayesian Filters in Python",
    url: "https://github.com/rlabbe/Kalman-and-Bayesian-Filters-in-Python",
  },
  "robot-slam": {
    title: "Dellaert & Kaess · Factor Graphs for Robot Perception",
    url: "https://www.cs.cmu.edu/~kaess/pub/Dellaert17fnt.html",
  },
  "robot-route": {
    title: "LaValle · Planning Algorithms",
    url: "https://lavalle.pl/planning/",
  },
  "robot-vision": {
    title: "OpenCV · Image Moments",
    url: "https://docs.opencv.org/4.x/d0/d49/tutorial_moments.html",
  },
  "rtos-schedule": {
    title:
      "Liu & Layland · Scheduling Algorithms for Multiprogramming in a Hard-Real-Time Environment",
    url: "https://doi.org/10.1145/321738.321743",
  },
  "office-automation": google,
  "sequence-align": {
    title: "MIT OCW · Computational Biology · Sequence Alignment",
    url: "https://ocw.mit.edu/courses/6-047-computational-biology-fall-2015/",
  },
  "gis-distance": {
    title: "PROJ · Geodesic calculations",
    url: "https://proj.org/en/stable/geodesic.html",
  },
  "finance-npv": {
    title: "OpenStax · Principles of Finance · Net Present Value",
    url: "https://openstax.org/books/principles-finance/pages/16-2-net-present-value-npv-method",
  },
  "quantum-phase": {
    title: "IBM Quantum Learning · Basics of Quantum Information",
    url: "https://quantum.cloud.ibm.com/learning/en/courses/basics-of-quantum-information",
  },
  reinforce: {
    title: "Sutton & Barto · Reinforcement Learning",
    url: "http://incompleteideas.net/book/the-book-2nd.html",
  },
  "k-973542117170": {
    title: "Microsoft Learn · C# enumeration types",
    url: "https://learn.microsoft.com/dotnet/csharp/language-reference/builtin-types/enum",
  },
  "k-9ebbc06ae649": {
    title: "OASIS · MQTT 5.0",
    url: "https://docs.oasis-open.org/mqtt/mqtt/v5.0/mqtt-v5.0.html",
  },
  "k-bfdf27de02fd": {
    title: "Apache Airflow · DAGs",
    url: "https://airflow.apache.org/docs/apache-airflow/stable/core-concepts/dags.html",
  },
  "k-4f50b1101d8e": {
    title: "Android Developers · Save UI states",
    url: "https://developer.android.com/topic/libraries/architecture/saving-states",
  },
};

export const appliedTerms: Record<string, string> = {
  "k-18dc6d89df55": "Game Loop",
  "k-3480cb7f26a7": "Coordinate System",
  "k-88cd833ec42f": "Vector Motion",
  "k-46fe981be8f5": "Collision Detection",
  "k-84d207bb0d06": "Finite-State Machine",
  "k-73ad252fb2c7": "Unity",
  "k-973542117170": "C#",
  "k-0cd7d0dc70b9": "Electrical Circuit",
  "k-8671fc7fd000": "Arduino",
  "k-7a4a31ab4abc": "Sensor Calibration",
  "k-aaddd9145a76": "Motor & PWM",
  "k-f6a9bef3e081": "Apps Script",
  "k-22d6b64cd5ed": "Trigger",
  "k-f12f63dddc67": "Office Workflow",
  "k-b00395f9c617": "Unity Architecture",
  "k-46b72eb02822": "2D and 3D Game Mechanics",
  "k-34b53d7ef91a": "Behavior Tree",
  "k-0621b70bba41": "Multiplayer Networking",
  "k-48231dd4253d": "Computer Graphics Foundations",
  "k-b63db2050d47": "Embedded C++",
  "k-82c626c9206d": "Interrupt",
  "k-9ebbc06ae649": "Internet of Things",
  "k-c2a7f1e14857": "Signal Processing",
  "k-eb60e755986e": "PID Controller",
  "k-a7656824dac0": "Robot Kinematics",
  "k-4f6f9b018d85": "Simulation Study",
  "k-34a241706257": "API Automation",
  "k-b694a5f5007a": "Webhook",
  "k-bfdf27de02fd": "Workflow Orchestration",
  "k-4f50b1101d8e": "Mobile Application Development",
  "k-0cf97d2cef44": "Computer Graphics",
  "k-b6c16354b041": "Rendering Pipeline",
  "k-0866c19cfef3": "Shader",
  "k-ba0d43ea1507": "Physically Based Rendering",
  "k-b84187100bc4": "Game Engine",
  "k-b64481cb3fbc": "Physics Simulation",
  "k-9b677eeb97b6": "Procedural Generation",
  "k-4a7bad0a2367": "Control Theory",
  "k-f83593e899a9": "Kalman Filter",
  "k-a37a7f797a1f": "Particle Filter",
  "k-5fc0beb038e9": "Simultaneous Localization and Mapping",
  "k-a607f825c850": "Path Planning",
  "k-6a574a1af2a9": "Robot Vision",
  "k-64d9c29d15fc": "Real-Time Operating System",
  "k-aea293480c44": "Robot Learning",
  "k-70f3a00d9538": "Scientific Computing",
  "k-9d219250bcaa": "Computational Biology",
  "k-5bd5247cfcd4": "Geographic Information System",
  "k-ffb230146b84": "Financial Modeling",
  "k-74f74b2295b6": "Quantum Computing",
};
