import {describe,it,expect,vi,beforeEach} from 'vitest';
import {MARKET} from '../src/lib/types';
const mocks=vi.hoisted(()=>({market:vi.fn(),marketItems:vi.fn(),readCollector:vi.fn()}));
vi.mock('../src/lib/auction',()=>({auction:mocks}));
vi.mock('../src/lib/collector',()=>({readCollector:mocks.readCollector}));
import {GET as market} from '../src/app/api/market/route';
import {GET as collector} from '../src/app/api/collector/route';
beforeEach(()=>{vi.clearAllMocks();mocks.marketItems.mockResolvedValue({market:MARKET,snapshots:[]});mocks.readCollector.mockResolvedValue({enabled:true,market:MARKET,houseId:114,samples:[]});});
describe('search data endpoints',()=>{
 it('reads only the selected allowed items without storing a comparison list',async()=>{expect((await market(new Request('http://localhost/api/market?items=13444,2589'))).status).toBe(200);expect(mocks.marketItems).toHaveBeenCalledWith([13444,2589]);const response=await collector(new Request('http://localhost/api/collector?items=13444,2589'));expect(response.status).toBe(200);expect(mocks.readCollector).toHaveBeenCalledWith([13444,2589]);expect((await response.json()).market).toBe(MARKET);});
 it.each(['','999999999','13444,13444','13444,-1','13444,abc'])('rejects invalid query %s before fetching data',async raw=>{expect((await market(new Request(`http://localhost/api/market?items=${raw}`))).status).toBe(400);expect((await collector(new Request(`http://localhost/api/collector?items=${raw}`))).status).toBe(400);expect(mocks.marketItems).not.toHaveBeenCalled();expect(mocks.readCollector).not.toHaveBeenCalled();});
});
