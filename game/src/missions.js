// Original Marisol Bay story. All destinations are accessible streets or sidewalks.
export const MISSIONS = [
  {title:'01 / A borrowed beginning',giver:'MAMA ROSA',reward:450,time:210,
    briefing:'Dario, every legend starts with a delivery. Take a car to my café, collect the envelope, then leave it at the Playa hotel. Keep the wheels intact.',
    stages:[{x:11.3,z:26,label:'Drive to Rosa’s café',vehicle:true},{x:339,z:-128,label:'Deliver the envelope to Playa',vehicle:true}]},
  {title:'02 / Heat on Palma',giver:'MAMA ROSA',reward:800,time:240,
    briefing:'My runner is trapped on Palma Avenue. Pick him up in a car. MBPD will be watching. Lose the tail before reaching our safe house in Las Palmas.',
    stages:[{x:68.3,z:-64,label:'Collect Rosa’s runner',vehicle:true,heat:2},{x:-267.3,z:-192,label:'Lose the cops; reach the safe house',vehicle:true,clean:true}]},
  {title:'03 / The reluctant repo',giver:'MAMA ROSA',reward:1100,time:240,
    briefing:'A client kept the Porter van and forgot to pay. Find our marked van in Centro, take it back, and return it to the Las Palmas garage.',
    stages:[{x:135.2,z:-102,label:'Take the marked Porter van',repo:true},{x:-139.3,z:-64,label:'Return the repo van to the garage',repo:true}]},
  {title:'04 / Teeth in the tide',giver:'MAMA ROSA',reward:1600,time:300,
    briefing:'Los Tiburones are leaning on my neighbors. Meet their crew at the east promenade. Bring a weapon, clear the corner, and stay alive. There is a pistol and armor near my café.',
    stages:[{x:339,z:64,label:'Confront Los Tiburones at the promenade',fight:true}]},
  {title:'05 / Saltwater ledger',giver:'MAMA ROSA',reward:2000,time:240,
    briefing:'The harbor ledger can end their racket. Drive to the dock gate, collect it, then carry it to our boardwalk contact. The crew has friends in uniform.',
    stages:[{x:196.3,z:300,label:'Collect the harbor ledger',vehicle:true,heat:3},{x:339,z:192,label:'Deliver the ledger to the boardwalk',vehicle:true}]},
  {title:'06 / Last light, first freedom',giver:'MAMA ROSA',reward:3500,time:300,
    briefing:'Dario, you have earned your way out. Pick up Rosa’s evidence at Centro. Survive the MBPD dragnet, lose every star, then meet her at the north coast. Marisol will remember you.',
    stages:[{x:11.3,z:0,label:'Collect Rosa’s evidence',vehicle:true,heat:4},{x:339,z:-300,label:'Lose the dragnet; escape to the coast',vehicle:true,clean:true}]},
];
export const TAXI_STOPS = [{x:75.3,z:-64,label:'Centro passenger'},{x:-139.3,z:-128,label:'Las Palmas passenger'},{x:339,z:0,label:'Playa passenger'},{x:203.3,z:256,label:'Port passenger'}];
