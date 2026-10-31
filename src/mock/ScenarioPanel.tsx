import { Button, Popover, Radio } from 'antd';
import { ExperimentOutlined } from '@ant-design/icons';
import { SCENARIOS, resetMockData, switchScenario, type Scenario } from './scenario';
import styles from './mock.module.css';

/** Floating dev panel (mock mode only): switch scenario, reset sample data. */
export function ScenarioPanel({ current }: { current: Scenario }) {
  const content = (
    <div className={styles.panel}>
      <Radio.Group
        value={current}
        onChange={(e) => switchScenario(e.target.value as Scenario)}
        options={Object.entries(SCENARIOS).map(([value, label]) => ({ value, label }))}
        className={styles.options}
      />
      <Button
        size="small"
        onClick={() => {
          resetMockData();
          window.location.reload();
        }}
      >
        Reset sample data &amp; progress
      </Button>
    </div>
  );

  return (
    <Popover content={content} title="Mock scenarios" trigger="click" placement="bottomRight">
      <Button className={styles.trigger} shape="round" icon={<ExperimentOutlined />}>
        Mock
      </Button>
    </Popover>
  );
}
