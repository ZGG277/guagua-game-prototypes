// Stylized game units, sized to the authored rider. Dimensions are shared by
// rendering, contact support, board inertia and continuous collision geometry.
export const BOARD=Object.freeze({halfLength:1.27,halfWidth:.205,halfStance:.58,segments:36,thickness:.045,top:.065,tipLift:.14,contactHalfSpan:.16,boardMass:4,previousLength:2.26,previousWidth:.33});
export const boardYawInertiaDelta=BOARD.boardMass*((2*BOARD.halfLength)**2+(2*BOARD.halfWidth)**2-BOARD.previousLength**2-BOARD.previousWidth**2)/12;
export function boardSection(i){const x=-BOARD.halfLength+2*BOARD.halfLength*i/BOARD.segments,r=Math.abs(x)/BOARD.halfLength,width=BOARD.halfWidth*(.88+.12*r)*(r>.86?Math.sqrt(Math.max(.015,1-((r-.86)/.14)**2)):1),y=BOARD.top+(Math.max(0,r-.72)/.28)**2*BOARD.tipLift;return{x,width,y};}
