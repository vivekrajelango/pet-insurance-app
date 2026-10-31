import { Avatar, Button, Menu, Popover } from 'antd';
import {
  DisconnectOutlined,
  FileProtectOutlined,
  LoginOutlined,
  LogoutOutlined,
  ReloadOutlined,
  SettingOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { OWNER } from './data';
import { resetMockData, switchScenario } from './scenario';
import styles from './mock.module.css';

const name = OWNER.name ?? 'Pet parent';
const initials = name
  .split(' ')
  .map((part) => part[0])
  .join('')
  .slice(0, 2)
  .toUpperCase();

/** Top-right profile button (mock mode only): stands in for the site's account menu. */
export function ProfileMenu({ loggedOut }: { loggedOut: boolean }) {
  if (loggedOut) {
    return (
      <Button
        className={styles.trigger}
        shape='round'
        icon={<LoginOutlined />}
        onClick={() => switchScenario('default')}
      >
        Log in
      </Button>
    );
  }

  const content = (
    <div className={styles.profile}>
      <div className={styles.profileHead}>
        <Avatar size={44} className={styles.avatar}>
          {initials}
        </Avatar>
        <div>
          <div className={styles.profileName}>{name}</div>
          <div className={styles.profileEmail}>{OWNER.email}</div>
        </div>
      </div>
      <Menu
        selectable={false}
        className={styles.profileMenu}
        onClick={({ key }) => {
          if (key === 'reset') {
            resetMockData();
            window.location.reload();
          } else if (key === 'unavailable') {
            switchScenario('unavailable');
          } else if (key === 'logout') {
            switchScenario('loggedOut');
          }
        }}
        items={[
          {
            key: 'profile',
            icon: <UserOutlined />,
            label: <a href='#my-profile'>My profile</a>,
          },
          {
            key: 'policies',
            icon: <FileProtectOutlined />,
            label: <a href='#my-policies'>My policies</a>,
          },
          {
            key: 'settings',
            icon: <SettingOutlined />,
            label: <a href='#settings'>Settings</a>,
          },
          { type: 'divider' },
          {
            key: 'unavailable',
            icon: <DisconnectOutlined />,
            label: 'Service unavailable page',
          },
          { key: 'reset', icon: <ReloadOutlined />, label: 'Reset demo data' },
          {
            key: 'logout',
            icon: <LogoutOutlined />,
            label: 'Log out',
            danger: true,
          },
        ]}
      />
    </div>
  );

  return (
    <Popover
      content={content}
      trigger='click'
      placement='bottomRight'
      arrow={false}
    >
      <button
        type='button'
        className={styles.avatarTrigger}
        aria-label={`Account menu for ${name}`}
      >
        <Avatar size={40} className={styles.avatar}>
          {initials}
        </Avatar>
      </button>
    </Popover>
  );
}
